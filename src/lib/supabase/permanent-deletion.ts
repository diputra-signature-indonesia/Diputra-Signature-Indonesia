import 'server-only';

import { deleteManagedDriveFiles, type DeletionManifest } from '@/lib/google-drive/delete-managed-files';
import { createSupabaseSecretServerClient } from '@/lib/supabase/secret-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Invoked only by server actions after requireActiveAdmin. Prepare RPCs enforce
// admin/version/confirmation again; finalizers are executable only by service_role.
export async function deleteJobPermanently(input: { jobId: string; version: number; confirmation: string }, actorId: string) {
  const secret = createSupabaseSecretServerClient();
  const supabase = await createSupabaseServerClient();
  const prepared = await supabase.rpc('prepare_job_deletion', { p_job_id: input.jobId, p_expected_version: input.version, p_confirmation: input.confirmation });
  if (prepared.error) return { error: prepared.error };
  const manifest = prepared.data as unknown as DeletionManifest;
  await deleteManagedDriveFiles(manifest, 'job', undefined, async (id, isFolder) => {
    const ack = await secret.rpc('ack_deleted_drive_target', { p_kind: 'job', p_id: input.jobId, p_token: manifest.token, p_google_id: id, p_is_folder: isFolder });
    if (ack.error) throw new Error('Drive deletion checkpoint failed.');
  });
  const finished = await secret.rpc('finish_job_deletion', { p_job_id: input.jobId, p_token: (prepared.data as unknown as DeletionManifest).token, p_actor: actorId });
  return { error: finished.error };
}

export async function deleteInternalService(input: { id: string; expectedVersion: number }, actorId: string) {
  const secret = createSupabaseSecretServerClient();
  const supabase = await createSupabaseServerClient();
  const prepared = await supabase.rpc('prepare_internal_service_deletion', { p_id: input.id, p_expected_version: input.expectedVersion });
  if (prepared.error) return { error: prepared.error, result: null };
  const manifest = prepared.data as unknown as DeletionManifest;
  if (manifest.result === 'deactivated') return { error: null, result: 'deactivated' };
  await deleteManagedDriveFiles(manifest, 'sop', undefined, async (id, isFolder) => {
    const ack = await secret.rpc('ack_deleted_drive_target', { p_kind: 'sop', p_id: input.id, p_token: manifest.token, p_google_id: id, p_is_folder: isFolder });
    if (ack.error) throw new Error('SOP Drive deletion checkpoint failed.');
  });
  // Clean only legacy objects explicitly mapped to this SOP. Never empty a bucket.
  for (const object of manifest.storage ?? []) {
    if (object.bucket !== 'sop-documents' || !object.path || object.path.startsWith('/') || object.path.split('/').some((segment) => segment === '..'))
      throw new Error('Unsafe legacy SOP storage target.');
    const removed = await secret.storage.from(object.bucket).remove([object.path]);
    if (removed.error) throw new Error('Legacy SOP object cleanup failed.');
    const ack = await secret.rpc('ack_deleted_sop_storage_target', { p_id: input.id, p_token: manifest.token, p_bucket: object.bucket, p_path: object.path });
    if (ack.error) throw new Error('Legacy SOP deletion checkpoint failed.');
  }
  const finished = await secret.rpc('finish_internal_service_deletion', { p_id: input.id, p_token: manifest.token, p_actor: actorId });
  return { error: finished.error, result: finished.error ? null : 'deleted' };
}
