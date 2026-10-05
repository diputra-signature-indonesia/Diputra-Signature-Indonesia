import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { scheduleAdminPageRequest } from '../../src/components/layout-admin/admin-page-request.ts';
import { adminDeadline, makassarToday } from '../../src/lib/admin-deadline.ts';
import { masterDataCategoryDefinitions } from '../../src/data/admin-master-data/master-data.ts';
const require = createRequire(import.meta.url),
  ts = require('typescript');
function compile(path, mocks) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => (name in mocks ? mocks[name] : require(name)), exports);
  return exports;
}
const row = {
  id: 'job-70',
  client_id: 'client',
  pic_id: 'pic',
  title: 'Job 70',
  client_name: 'Client',
  service_name: 'Service',
  pic_name: 'PIC',
  status_name: 'Not Started',
  status_code: 'NOT_STARTED',
  status_color: '#333',
  priority_name: 'High',
  priority_color: '#333',
  estimated_end_date: null,
  start_date: null,
  created_at: '2026-10-05T00:00:00Z',
  estimated_duration_days: null,
  progress_percentage: 0,
  current_step_name: null,
  latest_message: null,
  latest_date: null,
  latest_author: null,
  task_count: 0,
  completed_count: 0,
  internal_service_id: 'service',
  task_due_date: null,
};
function rpcHarness(data) {
  const calls = [];
  return {
    calls,
    client: {
      rpc(name, args) {
        calls.push({ name, args });
        const builder = {
          abortSignal(signal) {
            calls.at(-1).signal = signal;
            return builder;
          },
          then(resolve) {
            return Promise.resolve({ data, error: null }).then(resolve);
          },
        };
        return builder;
      },
    },
  };
}
test('paged query modules make a fixed one data RPC regardless of catalogue size', async () => {
  for (const total of [1, 70, 1075]) {
    const feed = rpcHarness({ rows: [row], total, page: 1 });
    const mocks = {
      'server-only': {},
      '@/lib/supabase/server': { createSupabaseServerClient: async () => feed.client },
      '@/data/admin-all-jobs/all-jobs-dummy-data': { initialAllJobsFilters: { status: 'ALL' } },
    };
    const jobs = compile('../../src/lib/supabase/queries/all-jobs.ts', mocks);
    assert.equal((await jobs.getAdminJobPage({ query: 'Job 70' }, 7)).total, total);
    assert.equal(feed.calls.length, 1);
    assert.equal(feed.calls[0].args.p_page, 7);
    const tasks = rpcHarness({ jobs: [row], total, page: 1, selectedId: row.id, tasks: [], statuses: [], taskTotal: 0, taskPage: 1, jobStatuses: [] });
    const tq = compile('../../src/lib/supabase/queries/my-tasks.ts', {
      'server-only': {},
      '@/lib/supabase/server': { createSupabaseServerClient: async () => tasks.client },
      '@/lib/admin-deadline': { adminDeadline },
    });
    assert.equal((await tq.getMyTaskPage({ query: 'find' }, 3)).total, total);
    assert.equal(tasks.calls.length, 1);
    const master = rpcHarness({ rows: [{ id: 'title', name: 'Title', code: 'CODE', version: 1, is_active: true }], total, page: 4 });
    const mq = compile('../../src/lib/supabase/queries/master-data.ts', {
      'server-only': {},
      '@/lib/supabase/server': { createSupabaseServerClient: async () => master.client },
      '@/data/admin-master-data/master-data': { masterDataCategoryDefinitions },
    });
    assert.equal((await mq.getMasterDataPage('job-titles', 'Title', 4)).total, total);
    assert.equal(master.calls.length, 1);
    const people = rpcHarness({ profiles: [], total, page: 2 });
    const uq = compile('../../src/lib/supabase/queries/user-management.ts', { 'server-only': {}, '@/lib/supabase/server': { createSupabaseServerClient: async () => people.client } });
    assert.equal((await uq.getManagedProfilePage('user', 2)).total, total);
    assert.equal(people.calls.length, 1);
  }
});

test('Dashboard aggregates and Client Service projections each make one data RPC', async () => {
  for (const total of [1, 70, 1075]) {
    const dashboard = rpcHarness({ counts: { active: total }, taskLoads: [], internalServices: [], attention: [], statuses: [] });
    const dq = compile('../../src/lib/supabase/queries/dashboard.ts', { 'server-only': {}, '@/lib/supabase/server': { createSupabaseServerClient: async () => dashboard.client } });
    assert.equal((await dq.getDashboardData({ pic: 'pic' })).metrics[0].value, total);
    assert.equal(dashboard.calls.length, 1);
    const content = rpcHarness({
      categories: [],
      categoryTotal: total,
      categoryPage: 1,
      selected: null,
      itemTotal: 0,
      itemPage: 1,
      details: [],
      detailTotal: 0,
      detailPage: 1,
      nextCategoryOrder: 0,
      nextItemOrder: 0,
      nextDetailOrder: 0,
    });
    const cq = compile('../../src/lib/supabase/queries/public-service-management.ts', { 'server-only': {}, '@/lib/supabase/server': { createSupabaseServerClient: async () => content.client } });
    assert.equal((await cq.getPublicServiceManagementData({ query: 'Visa', categoryPage: 7 })).categoryTotal, total);
    assert.equal(content.calls.length, 1);
    assert.equal(content.calls[0].args.p_category_page, 7);
  }
});
test('Review labels use fixed batches bounded to the requested review/link pages', async () => {
  for (const total of [1, 70, 1075]) {
    const calls = [];
    const makeRows = (prefix) =>
      Array.from({ length: Math.min(total, 10) }, (_, i) => ({
        id: prefix + i,
        review_request_id: 'snapshot' + i,
        client_id: prefix + 'client' + i,
        job_id: prefix + 'job' + i,
        name: 'Client',
        client_name: 'Client',
        expires_at: null,
        used_at: null,
        revoked_at: null,
      }));
    const client = {
      from(table) {
        const call = { table };
        const builder = {};
        for (const method of ['select', 'is', 'eq', 'or', 'not', 'gt', 'lte', 'order', 'range', 'in']) {
          builder[method] = (...args) => {
            call[method] = args;
            return builder;
          };
        }
        builder.then = (resolve) => {
          calls.push(call);
          let data = [];
          if (!call.select?.[1]?.head) {
            if (call.range) data = makeRows(table === 'reviews' ? 'r' : 'q');
            else if (table === 'clients') data = call.in[1].map((id) => ({ id, name: 'Client' }));
            else if (table === 'jobs') data = call.in[1].map((id) => ({ id, title: 'Job' }));
            else data = call.in[1].map((id) => ({ id, client_name: 'Snapshot' }));
          }
          return Promise.resolve({ data, count: total, error: null }).then(resolve);
        };
        return builder;
      },
    };
    const q = compile('../../src/lib/supabase/queries/reviews.ts', {
      'server-only': {},
      '@/lib/auth/admin-access': { requireActiveAdmin: async () => ({ role: 'admin' }) },
      '@/lib/supabase/server': { createSupabaseServerClient: async () => client },
    });
    const data = await q.getReviewManagementData({ query: 'find', page: 7, reviewStatus: 'ALL', featured: 'ALL', requestState: 'ALL' });
    assert.equal(data.reviewTotal, total);
    assert.equal(calls.length, 9);
    for (const table of ['clients', 'jobs']) {
      const batch = calls.filter((call) => call.table === table);
      assert.equal(batch.length, 1);
      assert.ok(batch[0].in[1].length <= 20);
    }
    for (const call of calls.filter((call) => call.range)) assert.deepEqual(call.range, [60, 69]);
  }
});

const flush = () => new Promise((resolve) => setImmediate(resolve));
test('shared 400ms request debounce sends only final keystroke query', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const urls = [],
    values = [];
  const request = (url) =>
    scheduleAdminPageRequest({
      url,
      delay: 400,
      onSuccess: (value) => values.push(value),
      onError: assert.fail,
      fetcher: async (url) => {
        urls.push(url);
        return Response.json({ total: 70 });
      },
    });
  let cancel = request('/v');
  t.mock.timers.tick(100);
  cancel();
  cancel = request('/vi');
  t.mock.timers.tick(100);
  cancel();
  request('/visa');
  t.mock.timers.tick(399);
  assert.equal(urls.length, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual(urls, ['/visa']);
  assert.deepEqual(values, [{ total: 70 }]);
});
test('obsolete success/error is ignored even if transport delivers after abort', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const values = [],
    errors = [];
  let resolveOld, signal;
  const cancel = scheduleAdminPageRequest({
    url: '/old',
    delay: 0,
    onSuccess: (v) => values.push(v),
    onError: (e) => errors.push(e),
    fetcher: (_, o) => {
      signal = o.signal;
      return new Promise((resolve) => (resolveOld = resolve));
    },
  });
  t.mock.timers.tick(0);
  cancel();
  assert.equal(signal.aborted, true);
  scheduleAdminPageRequest({
    url: '/new',
    delay: 0,
    onSuccess: (v) => values.push(v),
    onError: (e) => errors.push(e),
    fetcher: async (_, o) => {
      assert.equal(o.cache, 'no-store');
      return Response.json({ page: 7 });
    },
  });
  t.mock.timers.tick(0);
  await flush();
  resolveOld(Response.json({ message: 'Old failed query' }, { status: 500 }));
  await flush();
  assert.deepEqual(values, [{ page: 7 }]);
  assert.deepEqual(errors, []);
});
test('active permission error is surfaced and credentials stay same-origin', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const errors = [];
  scheduleAdminPageRequest({
    url: '/denied',
    delay: 0,
    onSuccess: assert.fail,
    onError: (e) => errors.push(e),
    fetcher: async (_, o) => {
      assert.equal(o.credentials, 'same-origin');
      return Response.json({ message: 'Admin access required' }, { status: 403 });
    },
  });
  t.mock.timers.tick(0);
  await flush();
  assert.deepEqual(errors, ['Admin access required']);
});
test('deadline labels respect Makassar midnight, completed state and task deadline', () => {
  assert.equal(makassarToday(new Date('2026-10-04T17:00:00Z')), '2026-10-05');
  assert.equal(adminDeadline('2026-10-04', false, '2026-10-05').note, 'Overdue 1 days');
  assert.equal(adminDeadline('2026-10-05', false, '2026-10-05').note, 'Due Today');
  assert.equal(adminDeadline(null, true).note, 'Completed');
});
