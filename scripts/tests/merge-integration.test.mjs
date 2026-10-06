import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function compile(path, mocks) {
  const output = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => (name in mocks ? mocks[name] : require(name)), exports);
  return exports;
}
function clientHarness(resolve) {
  const calls = [];
  const builder = (call) => {
    calls.push(call);
    const value = {};
    for (const method of ['select', 'eq', 'is', 'not', 'or', 'order', 'range', 'in', 'single', 'maybeSingle', 'abortSignal']) {
      value[method] = (...args) => {
        call[method] = args;
        return value;
      };
    }
    value.then = (done) => Promise.resolve(resolve(call)).then(done);
    return value;
  };
  return { calls, client: { from: (table) => builder({ table }), rpc: (rpc, args) => builder({ rpc, args }) } };
}

test('merge retains production logging, Q&A and recovery without reverting paged workspaces', () => {
  const page = source('src/app/admin/all-jobs/[jobId]/page.tsx');
  assert.match(page, /<JobActivitySection jobId=\{jobId\}/);
  assert.match(source('src/components/admin-public-services/public-services-workspace.tsx'), /QuestionAnswerModal/);
  assert.match(source('src/app/admin/public-services/page.tsx'), /canManageServices=\{context.role === 'admin' \|\| context.role === 'super_admin'\}/);
  for (const path of ['admin-all-jobs/all-jobs-workspace', 'admin-my-tasks/my-tasks-workspace', 'admin-user-management/user-management-workspace', 'admin-public-services/public-services-workspace']) {
    assert.match(source(`src/components/${path}.tsx`), /useAdminPage/);
  }
  const users = source('src/components/admin-user-management/user-management-workspace.tsx');
  assert.match(users, /restoreProfileAction/);
  assert.match(users, /deleteRejectedAccessRequestAction/);
  assert.match(users, /AllJobsPagination noun="users" currentPage=\{trash/);
});

test('deleted users are counted and fetched ten at a time, with cancellation', async () => {
  const h = clientHarness(() => ({ data: [{ id: 'deleted', deleted_at: '2026-10-05' }], count: 70, error: null }));
  const query = compile('src/lib/supabase/queries/user-management.ts', { 'server-only': {}, '@/lib/supabase/server': { createSupabaseServerClient: async () => h.client } });
  const signal = new AbortController().signal;
  const result = await query.getTrashedProfilePage(7, signal);
  assert.equal(result.total, 70);
  assert.equal(result.page, 7);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].range, [60, 69]);
  assert.deepEqual(h.calls[0].not, ['deleted_at', 'is', null]);
  assert.equal(h.calls[0].abortSignal[0], signal);
  assert.equal(result.profiles[0].teamMember, null);
  assert.match(source('src/app/api/admin/users/route.ts'), /profile\?\.role !== 'super_admin'/);
});

test('Q&A fetch is lazy, server-scoped to selected service plus global, and fails closed', async () => {
  const h = clientHarness(() => ({ data: [], error: null }));
  const query = compile('src/lib/supabase/queries/question-answer-management.ts', { 'server-only': {}, '@/lib/supabase/server': { createSupabaseServerClient: async () => h.client } });
  await query.getQuestionAnswerManagementData('visa');
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].or, ['services_categories_id.eq.visa,services_categories_id.is.null']);
  assert.match(source('src/components/admin-public-services/public-services-workspace.tsx'), /qnaOpen && selectedId/);
  assert.match(source('src/components/admin-public-services/question-answer-modal.tsx'), /isPending \|\| loading \|\| Boolean\(error\)/);
  assert.match(source('src/app/api/admin/question-answers/route.ts'), /if \(!UUID.test\(category\)\)/);
});

test('contributor permissions use one batched task count query instead of per-user requests', async () => {
  const h = clientHarness((call) => {
    if (call.table === 'jobs') return { data: { id: 'job', pic_id: 'pic', status_id: 'status' }, error: null };
    if (call.table === 'job_statuses') return { data: { code: 'NOT_STARTED' }, error: null };
    if (call.table === 'job_contributors') return { data: [{ profile_id: 'busy' }, { profile_id: 'free' }], error: null };
    if (call.rpc === 'search_job_remarks') return { data: { rows: [], total: 0, page: 1 }, error: null };
    if (call.rpc === 'list_assignable_profiles') return { data: ['pic', 'busy', 'free'].map((id) => ({ id, display_name: id })), error: null };
    if (call.table === 'profiles')
      return {
        data: [
          { id: 'busy', tasks: [{ count: 2 }] },
          { id: 'free', tasks: [{ count: 0 }] },
        ],
        error: null,
      };
    return { data: [], error: null };
  });
  const query = compile('src/lib/supabase/queries/job-detail.ts', {
    'server-only': {},
    '@/lib/supabase/server': { createSupabaseServerClient: async () => h.client },
    '@/lib/auth/admin-access': { requireActiveAdmin: async () => ({ role: 'admin', userId: 'actor' }) },
    '@/lib/supabase/queries/all-jobs': { getAdminJobPage: async () => ({ jobs: [{ id: 'job' }] }) },
  });
  const detail = await query.getJobDetail('job');
  assert.deepEqual(
    detail.contributors.map((c) => [c.id, c.canRemove]),
    [
      ['pic', false],
      ['busy', false],
      ['free', true],
    ]
  );
  const counts = h.calls.filter((call) => call.table === 'profiles');
  assert.equal(counts.length, 1);
  assert.deepEqual(counts[0].in, ['id', ['pic', 'busy', 'free']]);
  assert.match(counts[0].select[0], /tasks!tasks_assignee_id_fkey\(count\)/);
  const card = source('src/components/admin-job-detail/live-contributor-card.tsx');
  assert.match(card, /AdminRemoteSelect kind="profiles"/);
  assert.doesNotMatch(card, /ProfileCombobox/);
});

test('staff retain read-only service pages with exact counts and fixed batched queries', async () => {
  for (const total of [70, 1000]) {
    const h = clientHarness((call) => ({
      data:
        call.table === 'services_categories' ? [{ id: 'service70', title: 'Visa', services_items: [{ count: 35 }] }] : [{ id: 'item', title: 'Sub-service', services_item_details: [{ count: 3 }] }],
      count: call.table === 'services_categories' ? total : 35,
      error: null,
    }));
    const query = compile('src/lib/supabase/queries/public-service-management.ts', {
      'server-only': {},
      '@/lib/supabase/server': { createSupabaseServerClient: async () => h.client },
    });
    const signal = new AbortController().signal;
    const result = await query.getStaffPublicServiceManagementData({ categoryId: 'service70', categoryPage: 7, itemPage: 2, query: 'Visa' }, signal);
    assert.equal(result.categoryTotal, total);
    assert.equal(result.itemTotal, 35);
    assert.equal(result.selected.items[0].detailCount, 3);
    assert.equal(h.calls.length, 2);
    assert.deepEqual(h.calls[0].range, [60, 69]);
    assert.deepEqual(h.calls[1].range, [10, 19]);
    assert.equal(h.calls[0].abortSignal[0], signal);
    assert.equal(h.calls[1].abortSignal[0], signal);
    assert.equal(
      h.calls.some((call) => call.rpc === 'admin_public_service_page'),
      false
    );
  }
  assert.match(source('src/app/admin/public-services/page.tsx'), /context.role === 'staff' \? await getStaffPublicServiceManagementData/);
  assert.match(source('src/app/api/admin/public-services/route.ts'), /profile.role === 'staff' \? getStaffPublicServiceManagementData/);
});

test('merge does not resurrect archived V2 migrations into the active chain', () => {
  const active = new URL('../../supabase/migrations/', import.meta.url);
  assert.equal(
    readdirSync(active).some((file) => file.startsWith('202609')),
    false
  );
  assert.ok(existsSync(new URL('../../supabase/archive/v2/migrations/20260927120000_question_answer_management.sql', import.meta.url)));
  for (const file of ['job-row-actions.tsx', 'trash-jobs-button.tsx']) {
    assert.equal(existsSync(new URL(`../../src/components/admin-all-jobs/${file}`, import.meta.url)), false);
  }
});

test('paged Job Trash and active Jobs share impact then exact-title permanent deletion', () => {
  const modal = source('src/components/admin-all-jobs/job-trash-button.tsx');
  assert.match(modal, /listTrashJobsAction\(page\)/);
  assert.match(modal, /JobDeletionModal/);
  const confirmation = source('src/components/admin-all-jobs/job-deletion-modal.tsx');
  assert.match(confirmation, /loadJobDeletionImpact/);
  assert.match(confirmation, /stage !== 'confirm'/);
  assert.match(confirmation, /confirmation !== impact.title/);
  assert.match(confirmation, /Review tetap disimpan/);
  const action = source('src/app/admin/all-jobs/trash-actions.ts');
  assert.match(action, /deleteJobPermanently\(input, actor.userId\)/);
  const workflow = source('src/lib/supabase/permanent-deletion.ts');
  assert.match(workflow, /prepare_job_deletion/);
  assert.match(workflow, /finish_job_deletion/);
});
