import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { jobActionPermissions } from '../../src/lib/admin-all-jobs/action-permissions.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../../src/app/admin/all-jobs/row-actions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const jobId = 'f6200000-0000-4000-8000-000000000001';
function harness({ role = 'admin', folder = true, folderError = null, archiveError = null, restoreError = null, driveError = false, readDriveError = false, jobVersion = 4 } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const builder = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        is() {
          return builder;
        },
        not() {
          return builder;
        },
        async maybeSingle() {
          return table === 'jobs' ? { data: { id: jobId, version: jobVersion }, error: null } : { data: folder ? { google_folder_id: 'folder' } : null, error: folderError };
        },
      };
      return builder;
    },
    async rpc(name) {
      calls.push(name);
      return { data: 5, error: name === 'trash_job' ? archiveError : restoreError };
    },
  };
  const mocks = {
    '@/lib/auth/admin-access': { requireActiveAdmin: async () => ({ role, userId: 'actor' }) },
    '@/lib/supabase/queries/job-action-detail': { getJobActionDetail: async () => ({ canManage: true }) },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => supabase },
    '@/lib/google-drive/client': {
      trashDriveFile: async () => {
        calls.push('trashDrive');
        if (driveError) throw new Error('offline');
      },
      getDriveFile: async () => {
        calls.push('getDrive');
        if (readDriveError) throw new Error('missing');
        return { trashed: true };
      },
      restoreDriveFile: async () => {
        calls.push('restoreDrive');
        if (driveError) throw new Error('offline');
      },
    },
    'next/cache': { revalidatePath: () => calls.push('refresh') },
  };
  const exports = {};
  new Function('require', 'exports', compiled)((name) => {
    assert.ok(name in mocks, `unexpected dependency: ${name}`);
    return mocks[name];
  }, exports);
  return { actions: exports, calls };
}

test('All Jobs permissions distinguish PIC, staff, admin, completed, and demo jobs', () => {
  const base = { actorId: 'actor', picId: 'other', statusCode: 'IN_PROGRESS', role: 'staff' };
  assert.deepEqual(jobActionPermissions(base), { canEdit: false, canChangeStatus: false, canTrash: false });
  assert.deepEqual(jobActionPermissions({ ...base, picId: 'actor' }), { canEdit: true, canChangeStatus: true, canTrash: false });
  for (const role of ['admin', 'super_admin']) {
    assert.deepEqual(jobActionPermissions({ ...base, role }), { canEdit: true, canChangeStatus: true, canTrash: true });
    assert.deepEqual(jobActionPermissions({ ...base, role, statusCode: 'COMPLETED' }), { canEdit: false, canChangeStatus: false, canTrash: true });
    assert.deepEqual(jobActionPermissions({ ...base, role, isDummy: true }), { canEdit: false, canChangeStatus: false, canTrash: false });
  }
});
const input = { jobId, version: 4, confirmation: 'Job title' };
test('staff cannot trash jobs or invoke Drive', async () => {
  const { actions, calls } = harness({ role: 'staff' });
  assert.equal((await actions.trashJobAction(input)).ok, false);
  assert.deepEqual(calls, []);
});
test('stale database writes do not touch Drive', async () => {
  const { actions, calls } = harness({ archiveError: { code: '40001' } });
  assert.equal((await actions.trashJobAction(input)).ok, false);
  assert.deepEqual(calls, ['trash_job']);
});
test('folder metadata read failure leaves database and Drive untouched', async () => {
  const { actions, calls } = harness({ folderError: { message: 'read failed' } });
  assert.equal((await actions.trashJobAction(input)).ok, false);
  assert.deepEqual(calls, []);
});
test('archive is persisted before Drive trash', async () => {
  const { actions, calls } = harness();
  assert.equal((await actions.trashJobAction(input)).ok, true);
  assert.deepEqual(calls.slice(0, 2), ['trash_job', 'trashDrive']);
});
test('Drive failure reports recoverable partial success instead of a false database failure', async () => {
  const { actions, calls } = harness({ driveError: true });
  const result = await actions.trashJobAction(input);
  assert.equal(result.ok, true);
  assert.match(result.warning, /Retry Drive Trash/);
  assert.ok(calls.includes('refresh'));
});
test('jobs without document folders can still be archived and restored', async () => {
  const { actions, calls } = harness({ folder: false });
  assert.equal((await actions.trashJobAction(input)).ok, true);
  assert.equal((await actions.restoreJobAction(input)).ok, true);
  assert.equal(
    calls.some((call) => call.includes('Drive')),
    false
  );
});
test('restore recovers Drive before making Job active', async () => {
  const { actions, calls } = harness();
  assert.equal((await actions.restoreJobAction(input)).ok, true);
  assert.deepEqual(calls.slice(0, 3), ['getDrive', 'restoreDrive', 'restore_job']);
});
test('missing Drive folder prevents database restore', async () => {
  const { actions, calls } = harness({ readDriveError: true });
  assert.equal((await actions.restoreJobAction(input)).ok, false);
  assert.deepEqual(calls, ['getDrive']);
});
test('stale restore context does not mutate Drive', async () => {
  const { actions, calls } = harness({ jobVersion: 5 });
  assert.equal((await actions.restoreJobAction(input)).ok, false);
  assert.deepEqual(calls, []);
});
test('restore version conflict never blindly re-trashes a potentially restored folder', async () => {
  const { actions, calls } = harness({ restoreError: { code: '40001' } });
  assert.equal((await actions.restoreJobAction(input)).ok, false);
  assert.equal(calls.includes('trashDrive'), false);
});
