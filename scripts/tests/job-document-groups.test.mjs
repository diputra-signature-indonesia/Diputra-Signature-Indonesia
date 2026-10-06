import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path, mocks) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name) => {
    assert.ok(name in mocks, `Unexpected dependency ${name}`);
    return mocks[name];
  }, exports);
  return exports;
}
const jobId = 'f6700000-0000-4000-8000-000000000001';
const groupId = 'f6700000-0000-4000-8000-000000000002';
const actorId = 'f6700000-0000-4000-8000-000000000003';
const group = { id: groupId, job_id: jobId, job_drive_folder_id: 'mapping', google_folder_id: 'sub', folder_name: 'Company documents', status: 'READY', version: 2 };
class DriveError extends Error {
  constructor(status) {
    super(`Drive ${status}`);
    this.status = status;
  }
}
function harness({ role = 'admin', pending = false, groupStatus = 'READY', missing = false, moved = false, driveError, createError, prepareError, metadataError, finishError, groupJob = jobId } = {}) {
  const calls = [];
  let reads = 0;
  const supabase = {
    from(table) {
      const filters = {};
      const builder = {
        select() {
          return builder;
        },
        eq(key, value) {
          filters[key] = value;
          return builder;
        },
        is() {
          return builder;
        },
        async maybeSingle() {
          return builder.single();
        },
        async single() {
          let data =
            table === 'jobs'
              ? { id: jobId, title: 'Job', pic_id: actorId, deletion_started_at: pending ? 'pending' : null }
              : table === 'job_drive_folders'
                ? { id: 'mapping', google_folder_id: 'folder', google_drive_id: 'shared', connection_status: 'READY', web_view_url: 'https://drive.google.com/drive/folders/folder' }
                : table === 'job_document_groups'
                  ? { ...group, status: groupStatus, job_id: groupJob }
                  : null;
          if (table === 'job_document_groups' && filters.job_id !== groupJob) data = null;
          return { data, error: null };
        },
      };
      return builder;
    },
    async rpc(name, args) {
      calls.push([name, args]);
      if (name.startsWith('prepare_')) return { data: { ...group, status: name.endsWith('_trash') ? 'DELETING' : 'PENDING' }, error: prepareError };
      if (name.startsWith('save_')) return { data: 'document', error: metadataError };
      return { data: null, error: finishError };
    },
  };
  const actions = load('src/app/admin/all-jobs/[jobId]/document-actions.ts', {
    '@/lib/auth/admin-access': { requireActiveAdmin: async () => ({ role, userId: actorId }) },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => supabase },
    '@/lib/supabase/queries/job-documents': {
      getJobDocuments: async (...args) => {
        calls.push(['page', args]);
        return { documents: [] };
      },
    },
    'next/cache': { revalidatePath: () => calls.push('refresh') },
    'node:crypto': { randomUUID: () => groupId },
    '@/lib/google-drive/auth': { getGoogleDriveConfig: () => ({ sharedDriveId: 'shared', rootFolderId: 'root' }), GoogleDriveConfigurationError: class extends Error {} },
    '@/lib/google-drive/client': {
      GoogleDriveApiError: DriveError,
      generateDriveFileId: async () => {
        calls.push('generate');
        return 'generated';
      },
      getDriveFile: async (id) => {
        calls.push(['get', id]);
        if (driveError && id !== 'folder') throw driveError;
        if (id === 'sub') {
          if (missing && reads++ === 0) throw new DriveError(404);
          return { id, mimeType: 'application/vnd.google-apps.folder', driveId: 'shared', parents: [moved ? 'other' : 'folder'] };
        }
        if (id === 'folder') return { id, mimeType: 'application/vnd.google-apps.folder', driveId: 'shared', parents: ['root'] };
        return { id, name: 'test.pdf', mimeType: 'application/pdf', size: '12', webViewLink: 'https://drive.google.com/file/d/file/view', driveId: 'shared', parents: [moved ? 'other' : 'sub'] };
      },
      createJobDocumentGroupFolder: async (...args) => {
        calls.push(['createFolder', args]);
        if (createError) throw createError;
        return { id: 'sub', mimeType: 'application/vnd.google-apps.folder', driveId: 'shared', parents: ['folder'] };
      },
      createResumableUpload: async (...args) => {
        calls.push(['upload', args]);
        return 'https://upload.example.test';
      },
      trashDriveFile: async (id) => calls.push(['trash', id]),
    },
  });
  return { actions, calls };
}
test('upload without grouping remains at the Job root; group upload uses its child folder', async () => {
  for (const groupIdValue of [null, groupId]) {
    const { actions, calls } = harness();
    const result = await actions.prepareJobDocumentUploadAction({ jobId, groupId: groupIdValue, fileName: 'test.pdf', mimeType: 'application/pdf', sizeBytes: 12 });
    assert.equal(result.ok, true);
    assert.equal(calls.find((call) => Array.isArray(call) && call[0] === 'upload')[1][0], groupIdValue ? 'sub' : 'folder');
  }
});
test('cross-Job, pending, deleting and moved groups cannot receive uploads', async () => {
  for (const config of [{ groupJob: 'another' }, { groupStatus: 'PENDING' }, { groupStatus: 'DELETING' }, { moved: true }, { pending: true }]) {
    const { actions, calls } = harness(config);
    assert.equal((await actions.prepareJobDocumentUploadAction({ jobId, groupId, fileName: 'test.pdf', mimeType: 'application/pdf', sizeBytes: 12 })).ok, false);
    assert.equal(calls.includes('generate'), false);
  }
});
test('finalization saves grouping only after verifying the actual Drive parent', async () => {
  const { actions, calls } = harness();
  assert.equal((await actions.finalizeJobDocumentUploadAction({ jobId, groupId, googleFileId: 'file' })).ok, true);
  assert.equal(calls.find((call) => Array.isArray(call) && call[0] === 'save_grouped_job_document_metadata')[1].p_group_id, groupId);
  const wrong = harness({ moved: true });
  assert.equal((await wrong.actions.finalizeJobDocumentUploadAction({ jobId, groupId, googleFileId: 'file' })).ok, false);
  assert.equal(
    wrong.calls.some((call) => Array.isArray(call) && call[0].startsWith('save_')),
    false
  );
});
test('failed metadata finalization never trashes an already uploaded file automatically', async () => {
  const { actions, calls } = harness({ metadataError: { message: 'offline' } });
  assert.equal((await actions.finalizeJobDocumentUploadAction({ jobId, groupId, googleFileId: 'file' })).ok, false);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'trash'),
    false
  );
});
test('creation reserves a stable ID before calling Drive and completes afterward', async () => {
  const { actions, calls } = harness({ missing: true });
  assert.equal((await actions.createJobDocumentGroupAction({ jobId, name: 'Company documents' })).ok, true);
  const names = calls.map((call) => (Array.isArray(call) ? call[0] : call));
  assert.ok(names.indexOf('prepare_job_document_group') < names.indexOf('createFolder'));
  assert.ok(names.indexOf('createFolder') < names.indexOf('complete_job_document_group'));
  assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === 'createFolder')[1], ['folder', 'sub', groupId, 'Company documents']);
});
test('creation retry verifies an existing reserved folder instead of creating another', async () => {
  const { actions, calls } = harness();
  assert.equal((await actions.createJobDocumentGroupAction({ jobId, name: 'Company documents' })).ok, true);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'createFolder'),
    false
  );
});
test('duplicate-ID response verifies and completes the reserved folder', async () => {
  const { actions } = harness({ missing: true, createError: new DriveError(409) });
  assert.equal((await actions.createJobDocumentGroupAction({ jobId, name: 'Company documents' })).ok, true);
});
test('creation failures do not report success or finalize the pending reservation', async () => {
  const { actions, calls } = harness({ missing: true, createError: new Error('offline') });
  assert.equal((await actions.createJobDocumentGroupAction({ jobId, name: 'Company documents' })).ok, false);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'complete_job_document_group'),
    false
  );
});
test('group trash checks the parent and touches only the selected child folder', async () => {
  const { actions, calls } = harness();
  assert.equal((await actions.deleteJobDocumentGroupAction({ jobId, groupId, version: 2 })).ok, true);
  assert.deepEqual(
    calls.filter((call) => Array.isArray(call) && call[0] === 'trash'),
    [['trash', 'sub']]
  );
  assert.ok(calls.findIndex((call) => Array.isArray(call) && call[0] === 'trash') < calls.findIndex((call) => Array.isArray(call) && call[0] === 'finish_job_document_group_trash'));
});
test('stale delete, Drive failure, and moved folder never finalize trash', async () => {
  for (const config of [{ prepareError: { code: '40001' } }, { driveError: new DriveError(403) }, { moved: true }]) {
    const { actions, calls } = harness(config);
    assert.equal((await actions.deleteJobDocumentGroupAction({ jobId, groupId, version: 2 })).ok, false);
    assert.equal(
      calls.some((call) => Array.isArray(call) && call[0] === 'finish_job_document_group_trash'),
      false
    );
  }
});
test('missing group folder is retry-safe after validating its Job folder', async () => {
  const { actions, calls } = harness({ missing: true });
  assert.equal((await actions.deleteJobDocumentGroupAction({ jobId, groupId, version: 2 })).ok, true);
  assert.equal(
    calls.some((call) => Array.isArray(call) && call[0] === 'trash'),
    false
  );
});
test('document page action passes explicit folder and pagination to one bounded query', async () => {
  const { actions, calls } = harness();
  assert.equal((await actions.loadJobDocumentsPageAction({ jobId, groupId, page: 7, groupsPage: 2 })).ok, true);
  assert.deepEqual(calls, [['page', [jobId, groupId, 7, 2]]]);
});
test('Drive folder creation payload keeps inherited access without new ACLs', async () => {
  const client = load('src/lib/google-drive/client.ts', { 'server-only': {}, './auth': { getGoogleDriveAccessToken: async () => 'mock' } });
  const original = globalThis.fetch;
  let body;
  globalThis.fetch = async (url, init) => {
    body = JSON.parse(init.body);
    assert.match(url, /supportsAllDrives=true/);
    return new Response(JSON.stringify({ id: 'sub' }), { status: 200 });
  };
  try {
    await client.createJobDocumentGroupFolder('folder', 'sub', groupId, 'Company documents');
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(body.parents, ['folder']);
  assert.equal(body.mimeType, 'application/vnd.google-apps.folder');
  assert.equal(body.id, 'sub');
  assert.equal('permissions' in body, false);
  assert.equal('inheritedPermissionsDisabled' in body, false);
});
