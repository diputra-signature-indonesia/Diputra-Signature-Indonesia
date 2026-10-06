import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path, mocks) {
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name) => {
    assert.ok(name in mocks, `unexpected dependency: ${name}`);
    return mocks[name];
  }, exports);
  return exports;
}
const manifest = { token: 'reservation', folders: [{ id: 'folder', driveId: 'shared' }], files: [{ id: 'file', folderId: 'folder', driveId: 'shared' }] };
class DriveError extends Error {
  constructor(status) {
    super(`Drive ${status}`);
    this.status = status;
  }
}
function driveHarness({ error, moved = false, invalidRoot = false, deleteError, parents = {}, folders = ['folder'] } = {}) {
  const calls = [];
  const actions = load('src/lib/google-drive/delete-managed-files.ts', {
    'server-only': {},
    './auth': { getGoogleDriveConfig: () => ({ sharedDriveId: 'shared', rootFolderId: 'root' }), getGoogleDriveSopRootFolderId: () => 'sop-root' },
    './client': {
      GoogleDriveApiError: DriveError,
      getDriveFile: async (id) => {
        calls.push(`get:${id}`);
        if (id === 'root' || id === 'sop-root') return { driveId: invalidRoot ? 'other' : 'shared', mimeType: 'application/vnd.google-apps.folder' };
        if (error) throw error;
        return {
          driveId: 'shared',
          parents: moved ? ['unrelated'] : [parents[id] ?? (id === 'file' ? 'folder' : 'root')],
          mimeType: folders.includes(id) ? 'application/vnd.google-apps.folder' : 'application/pdf',
        };
      },
      deleteDriveFilePermanently: async (id) => {
        calls.push(`delete:${id}`);
        if (deleteError) throw deleteError;
      },
    },
  });
  const run = (data = manifest, deadline) => actions.deleteManagedDriveFiles(data, 'job', deadline, async (id, isFolder) => calls.push(`ack:${id}:${isFolder}`));
  return { calls, run };
}
test('managed cleanup deletes and checkpoints files before their folder', async () => {
  const { calls, run } = driveHarness();
  await run();
  assert.deepEqual(calls, ['get:root', 'get:file', 'delete:file', 'ack:file:false', 'get:folder', 'delete:folder', 'ack:folder:true']);
});

test('grouped files and child folders are cleaned before the Job folder even if manifest order changes', async () => {
  const { calls, run } = driveHarness({ parents: { nestedFile: 'sub', sub: 'folder' }, folders: ['folder', 'sub'] });
  await run({
    token: 'reservation',
    folders: [
      { id: 'folder', driveId: 'shared' },
      { id: 'sub', parentId: 'folder', driveId: 'shared' },
    ],
    files: [{ id: 'nestedFile', folderId: 'sub', driveId: 'shared' }],
  });
  assert.deepEqual(
    calls.filter((call) => call.startsWith('delete:')),
    ['delete:nestedFile', 'delete:sub', 'delete:folder']
  );
});

test('unregistered group parents and deeper nested folders are rejected before deletion', async () => {
  for (const folders of [
    [{ id: 'sub', parentId: 'unregistered', driveId: 'shared' }],
    [
      { id: 'folder', driveId: 'shared' },
      { id: 'sub', parentId: 'folder', driveId: 'shared' },
      { id: 'deep', parentId: 'sub', driveId: 'shared' },
    ],
  ]) {
    const { calls, run } = driveHarness();
    await assert.rejects(run({ token: 'reservation', folders, files: [] }), /Unsafe/);
    assert.deepEqual(calls, []);
  }
});
test('missing targets are retry-safe only after validating the managed root', async () => {
  const { calls, run } = driveHarness({ error: new DriveError(404) });
  await run();
  assert.deepEqual(calls, ['get:root', 'get:file', 'ack:file:false', 'get:folder', 'ack:folder:true']);
  const invalid = driveHarness({ invalidRoot: true, error: new DriveError(404) });
  await assert.rejects(invalid.run(), /root is invalid/);
  assert.deepEqual(invalid.calls, ['get:root']);
});
for (const error of [new DriveError(403), new Error('offline')]) {
  test(`${error.message} stops cleanup without acknowledging or deleting other targets`, async () => {
    const { calls, run } = driveHarness({ error });
    await assert.rejects(run(), error);
    assert.deepEqual(calls, ['get:root', 'get:file']);
  });
}
test('a failed permanent delete is never checkpointed', async () => {
  const { calls, run } = driveHarness({ deleteError: new DriveError(403) });
  await assert.rejects(run(), /403/);
  assert.deepEqual(calls, ['get:root', 'get:file', 'delete:file']);
});
test('root targets, wrong drives, and unmapped parents are rejected before network requests', async () => {
  for (const data of [
    { ...manifest, folders: [{ id: 'root', driveId: 'shared' }] },
    { ...manifest, files: [{ ...manifest.files[0], driveId: 'other' }] },
    { ...manifest, files: [{ ...manifest.files[0], folderId: 'unregistered' }] },
  ]) {
    const { calls, run } = driveHarness();
    await assert.rejects(run(data), /Unsafe/);
    assert.deepEqual(calls, []);
  }
});
test('moved files are not deleted and exhausted deadlines leave work for retry', async () => {
  const moved = driveHarness({ moved: true });
  await assert.rejects(moved.run(), /moved/);
  assert.deepEqual(moved.calls, ['get:root', 'get:file']);
  const expired = driveHarness();
  await assert.rejects(expired.run(manifest, Date.now() - 1), /retry/);
  assert.deepEqual(expired.calls, ['get:root']);
});
test('a manifest without Drive targets needs no Drive configuration', async () => {
  const { calls, run } = driveHarness();
  await run({ token: 'reservation', files: [], folders: [] });
  assert.deepEqual(calls, []);
});

function deletionHarness({ prepareError, driveError, ackError, storageError, data = manifest } = {}) {
  const calls = [];
  const actions = load('src/lib/supabase/permanent-deletion.ts', {
    'server-only': {},
    '@/lib/supabase/server': {
      createSupabaseServerClient: async () => ({
        rpc: async (name) => {
          calls.push(name);
          return { data, error: prepareError };
        },
      }),
    },
    '@/lib/supabase/secret-server': {
      createSupabaseSecretServerClient: () => ({
        rpc: async (name, args) => {
          calls.push([name, args]);
          return { error: name.startsWith('ack_') ? ackError : null };
        },
        storage: {
          from: (bucket) => ({
            remove: async (paths) => {
              calls.push(['remove', bucket, paths]);
              return { error: storageError };
            },
          }),
        },
      }),
    },
    '@/lib/google-drive/delete-managed-files': {
      deleteManagedDriveFiles: async (value, kind, deadline, onDeleted) => {
        calls.push(`drive:${kind}`);
        if (driveError) throw driveError;
        for (const file of value.files) await onDeleted(file.id, false);
        for (const folder of value.folders) await onDeleted(folder.id, true);
      },
    },
  });
  return { actions, calls };
}
const job = { jobId: 'job', version: 4, confirmation: 'Exact title' };
const service = { id: 'service', expectedVersion: 4 };
for (const message of ['unauthorized', 'stale version', 'wrong confirmation']) {
  test(`prepare rejection (${message}) never invokes Drive or finalization`, async () => {
    const error = { message };
    const { actions, calls } = deletionHarness({ prepareError: error });
    assert.equal((await actions.deleteJobPermanently(job, 'admin')).error, error);
    assert.deepEqual(calls, ['prepare_job_deletion']);
  });
}
test('job finalization runs only after external cleanup checkpoints', async () => {
  const { actions, calls } = deletionHarness();
  assert.equal((await actions.deleteJobPermanently(job, 'admin')).error, null);
  assert.deepEqual(
    calls.map((call) => (Array.isArray(call) ? call[0] : call)),
    ['prepare_job_deletion', 'drive:job', 'ack_deleted_drive_target', 'ack_deleted_drive_target', 'finish_job_deletion']
  );
  assert.deepEqual(calls.at(-1)[1], { p_job_id: 'job', p_token: 'reservation', p_actor: 'admin' });
});
test('Drive or checkpoint failures do not finalize the database graph', async () => {
  for (const config of [{ driveError: new Error('offline') }, { ackError: { message: 'database unavailable' } }]) {
    const { actions, calls } = deletionHarness(config);
    await assert.rejects(actions.deleteJobPermanently(job, 'admin'));
    assert.equal(
      calls.some((call) => Array.isArray(call) && call[0] === 'finish_job_deletion'),
      false
    );
  }
});
test('used services deactivate without deleting any SOP files', async () => {
  const { actions, calls } = deletionHarness({ data: { ...manifest, result: 'deactivated' } });
  assert.equal((await actions.deleteInternalService(service, 'admin')).result, 'deactivated');
  assert.deepEqual(calls, ['prepare_internal_service_deletion']);
});
test('legacy SOP cleanup removes only mapped objects and checkpoints before finalizing', async () => {
  const { actions, calls } = deletionHarness({ data: { token: 'reservation', files: [], folders: [], storage: [{ bucket: 'sop-documents', path: 'service/document.pdf' }] } });
  assert.equal((await actions.deleteInternalService(service, 'admin')).result, 'deleted');
  assert.deepEqual(
    calls.map((call) => (Array.isArray(call) ? call[0] : call)),
    ['prepare_internal_service_deletion', 'drive:sop', 'remove', 'ack_deleted_sop_storage_target', 'finish_internal_service_deletion']
  );
  assert.deepEqual(calls[2], ['remove', 'sop-documents', ['service/document.pdf']]);
});
test('unsafe storage targets or storage failures never finalize the service', async () => {
  for (const object of [
    { bucket: 'images', path: 'image.png' },
    { bucket: 'sop-documents', path: '../other.pdf' },
    { bucket: 'sop-documents', path: '/root.pdf' },
  ]) {
    const { actions, calls } = deletionHarness({ data: { token: 'reservation', files: [], folders: [], storage: [object] } });
    await assert.rejects(actions.deleteInternalService(service, 'admin'), /Unsafe/);
    assert.deepEqual(calls, ['prepare_internal_service_deletion', 'drive:sop']);
  }
  const { actions, calls } = deletionHarness({
    storageError: { message: 'offline' },
    data: { token: 'reservation', files: [], folders: [], storage: [{ bucket: 'sop-documents', path: 'service/doc.pdf' }] },
  });
  await assert.rejects(actions.deleteInternalService(service, 'admin'), /cleanup failed/);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0].startsWith('finish_')),
    false
  );
});
