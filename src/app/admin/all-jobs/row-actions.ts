'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getJobActionDetail, type JobActionDetail } from '@/lib/supabase/queries/job-action-detail';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDriveFile, restoreDriveFile, trashDriveFile } from '@/lib/google-drive/client';
import { revalidatePath } from 'next/cache';

type Result<T> = { ok: true; data: T; warning?: string } | { ok: false; message: string };
export type TrashJobRow = { id: string; title: string; version: number; archived_at: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string) => ({ ok: false as const, message });
const valid = (id: string, version: number) => UUID.test(id) && Number.isInteger(version) && version > 0;
function refresh(jobId: string) {
  revalidatePath('/admin/all-jobs');
  revalidatePath('/admin/my-tasks');
  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/all-jobs/${jobId}`);
}
function rpcFailure(error: { code?: string; message: string }) {
  if (error.code === '40001' || error.code === 'P0002') return fail('Job sudah berubah atau tidak ditemukan. Muat ulang data sebelum mencoba kembali.');
  if (error.code === '42501') return fail('Hanya admin atau super admin yang dapat mengelola Trash Job.');
  return fail('Operasi Job gagal. Periksa konfirmasi dan muat ulang data.');
}

export async function loadJobActionDetail(jobId: string): Promise<Result<JobActionDetail>> {
  if (!UUID.test(jobId)) return fail('Job tidak valid.');
  const detail = await getJobActionDetail(jobId);
  if (!detail) return fail('Job tidak ditemukan atau sudah berada di Trash.');
  if (!detail.canManage) return fail('Hanya PIC, admin, atau super admin yang dapat mengubah Job.');
  return { ok: true, data: detail };
}

export async function trashJobAction(input: { jobId: string; version: number; confirmation: string }): Promise<Result<null>> {
  const actor = await requireActiveAdmin();
  if (actor.role !== 'admin' && actor.role !== 'super_admin') return fail('Hanya admin yang dapat memindahkan Job ke Trash.');
  if (!valid(input.jobId, input.version) || !input.confirmation.trim()) return fail('Konfirmasi judul Job wajib diisi.');
  const supabase = await createSupabaseServerClient();
  const folder = await supabase.from('job_drive_folders').select('google_folder_id').eq('job_id', input.jobId).is('archived_at', null).maybeSingle();
  if (folder.error) return fail('Mapping folder Drive gagal dibaca. Job belum dihapus.');
  // Archive in the database first: stale/unauthorized requests must never mutate Drive.
  const result = await supabase.rpc('trash_job', { p_job_id: input.jobId, p_expected_version: input.version, p_confirmation: input.confirmation.trim() });
  if (result.error) return rpcFailure(result.error);
  let warning: string | undefined;
  if (folder.data) {
    try {
      await trashDriveFile(folder.data.google_folder_id);
    } catch {
      warning = 'Job sudah masuk Trash, tetapi folder Drive belum dapat dipindahkan. Buka Trash dan gunakan Retry Drive Trash, atau Restore Job.';
    }
  }
  refresh(input.jobId);
  return { ok: true, data: null, warning };
}

export async function listTrashJobsAction(page: number): Promise<Result<{ rows: TrashJobRow[]; count: number }>> {
  const actor = await requireActiveAdmin();
  if (actor.role !== 'admin' && actor.role !== 'super_admin') return fail('Hanya admin yang dapat melihat Trash Job.');
  if (!Number.isInteger(page) || page < 1) return fail('Halaman tidak valid.');
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('jobs')
    .select('id,title,version,archived_at', { count: 'exact' })
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
    .order('id')
    .range((page - 1) * 10, page * 10 - 1);
  if (result.error) return fail('Daftar Trash Job gagal dimuat.');
  return { ok: true, data: { rows: result.data ?? [], count: result.count ?? 0 } };
}

async function trashContext(input: { jobId: string; version: number }) {
  const actor = await requireActiveAdmin();
  if ((actor.role !== 'admin' && actor.role !== 'super_admin') || !valid(input.jobId, input.version)) return { ok: false as const, message: 'Akses atau data Trash tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const job = await supabase.from('jobs').select('id,version,deletion_started_at').eq('id', input.jobId).not('archived_at', 'is', null).maybeSingle();
  if (job.error || !job.data || job.data.version !== input.version) return { ok: false as const, message: 'Job sudah berubah. Muat ulang daftar Trash.' };
  if (job.data.deletion_started_at) return { ok: false as const, message: 'Job sedang dihapus permanen. Lanjutkan Delete Permanently, bukan Restore atau Retry Drive Trash.' };
  const folder = await supabase.from('job_drive_folders').select('google_folder_id').eq('job_id', input.jobId).not('archived_at', 'is', null).maybeSingle();
  if (folder.error) return { ok: false as const, message: 'Mapping folder Drive gagal dimuat.' };
  return { ok: true as const, supabase, folderId: folder.data?.google_folder_id };
}

export async function retryJobDriveTrashAction(input: { jobId: string; version: number }): Promise<Result<null>> {
  const context = await trashContext(input);
  if (!context.ok) return fail(context.message);
  try {
    if (context.folderId) await trashDriveFile(context.folderId);
  } catch {
    return fail('Folder Drive belum dapat dipindahkan ke Trash. Periksa konfigurasi dan akses service account.');
  }
  return { ok: true, data: null };
}

export async function restoreJobAction(input: { jobId: string; version: number }): Promise<Result<null>> {
  const context = await trashContext(input);
  if (!context.ok) return fail(context.message);
  // Restore Drive before publishing the Job again; do not blindly undo on a version conflict.
  try {
    if (context.folderId && (await getDriveFile(context.folderId)).trashed) await restoreDriveFile(context.folderId);
  } catch {
    return fail('Folder Drive tidak dapat dipulihkan. Job tetap di Trash. Periksa folder dan akses Drive.');
  }
  const result = await context.supabase.rpc('restore_job', { p_job_id: input.jobId, p_expected_version: input.version });
  if (result.error) return rpcFailure(result.error);
  refresh(input.jobId);
  return { ok: true, data: null };
}
