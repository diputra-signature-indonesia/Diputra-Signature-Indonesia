'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { deleteDriveFilePermanently, GoogleDriveApiError, setDriveFileTrashed } from '@/lib/google-drive/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type JobTrashActionResult = { ok: true; message: string } | { ok: false; message: string };

function refreshJobs(jobId?: string) {
  revalidatePath('/admin/all-jobs');
  revalidatePath('/admin/my-tasks');
  revalidatePath('/admin/dashboard');
  if (jobId) revalidatePath(`/admin/all-jobs/${jobId}`);
}

function failure(error: { code?: string; message: string }, fallback: string): JobTrashActionResult {
  if (error.code === '42501') return { ok: false, message: 'Hanya admin yang dapat mengelola Trash Job.' };
  if (error.code === '40001') return { ok: false, message: 'Data Job telah berubah. Muat ulang halaman lalu coba kembali.' };
  if (error.code === 'P0002') return { ok: false, message: 'Job tidak ditemukan atau status Trash sudah berubah.' };
  if (error.code === '22023') return { ok: false, message: 'Konfirmasi harus sama persis dengan judul Job atau nama client.' };
  return { ok: false, message: fallback };
}

async function requireJobAdmin() {
  const actor = await requireActiveAdmin();
  return actor.role === 'admin' || actor.role === 'super_admin' ? actor : null;
}

export async function trashJobAction(input: { jobId: string; version: number; confirmation: string }): Promise<JobTrashActionResult> {
  const actor = await requireJobAdmin();
  if (!actor) return { ok: false, message: 'Hanya admin yang dapat menghapus Job.' };
  if (!UUID.test(input.jobId) || !Number.isInteger(input.version) || input.version < 1 || !input.confirmation.trim()) {
    return { ok: false, message: 'Data konfirmasi penghapusan tidak valid.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: folder, error: folderError } = await supabase.from('job_drive_folders').select('google_folder_id').eq('job_id', input.jobId).is('archived_at', null).maybeSingle();
  if (folderError) return { ok: false, message: 'Folder Google Drive Job gagal diperiksa.' };

  let driveTrashed = false;
  try {
    if (folder?.google_folder_id) {
      await setDriveFileTrashed(folder.google_folder_id, true);
      driveTrashed = true;
    }
  } catch {
    return { ok: false, message: 'Folder Google Drive gagal dipindahkan ke Trash. Job belum dihapus.' };
  }

  const { error } = await supabase.rpc('trash_job', {
    p_job_id: input.jobId,
    p_expected_version: input.version,
    p_confirmation: input.confirmation.trim(),
  });
  if (error) {
    if (driveTrashed && folder?.google_folder_id) await setDriveFileTrashed(folder.google_folder_id, false).catch(() => undefined);
    return failure(error, 'Job gagal dipindahkan ke Trash.');
  }

  refreshJobs(input.jobId);
  return { ok: true, message: 'Job dan folder dokumennya dipindahkan ke Trash.' };
}

export async function restoreJobAction(input: { jobId: string; version: number }): Promise<JobTrashActionResult> {
  const actor = await requireJobAdmin();
  if (!actor) return { ok: false, message: 'Hanya admin yang dapat memulihkan Job.' };
  if (!UUID.test(input.jobId) || !Number.isInteger(input.version) || input.version < 1) return { ok: false, message: 'Job tidak valid.' };

  const supabase = await createSupabaseServerClient();
  const { data: folder, error: folderError } = await supabase.from('job_drive_folders').select('google_folder_id').eq('job_id', input.jobId).not('archived_at', 'is', null).maybeSingle();
  if (folderError) return { ok: false, message: 'Folder Google Drive Job gagal diperiksa.' };

  let driveRestored = false;
  try {
    if (folder?.google_folder_id) {
      await setDriveFileTrashed(folder.google_folder_id, false);
      driveRestored = true;
    }
  } catch {
    return { ok: false, message: 'Folder Google Drive gagal dipulihkan. Job tetap berada di Trash.' };
  }

  const { error } = await supabase.rpc('restore_job', { p_job_id: input.jobId, p_expected_version: input.version });
  if (error) {
    if (driveRestored && folder?.google_folder_id) await setDriveFileTrashed(folder.google_folder_id, true).catch(() => undefined);
    return failure(error, 'Job gagal dipulihkan dari Trash.');
  }

  refreshJobs(input.jobId);
  return { ok: true, message: 'Job dan folder dokumennya berhasil dipulihkan.' };
}

export async function permanentlyDeleteJobAction(input: { jobId: string; version: number; confirmation: string }): Promise<JobTrashActionResult> {
  const actor = await requireJobAdmin();
  if (!actor) return { ok: false, message: 'Hanya admin yang dapat menghapus permanen Job.' };
  if (!UUID.test(input.jobId) || !Number.isInteger(input.version) || input.version < 1 || !input.confirmation.trim()) {
    return { ok: false, message: 'Data konfirmasi penghapusan tidak valid.' };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: job, error: jobError }, { data: folder, error: folderError }] = await Promise.all([
    supabase.from('jobs').select('title,client_id,version').eq('id', input.jobId).not('archived_at', 'is', null).maybeSingle(),
    supabase.from('job_drive_folders').select('google_folder_id').eq('job_id', input.jobId).not('archived_at', 'is', null).maybeSingle(),
  ]);
  if (jobError || folderError || !job || job.version !== input.version) return { ok: false, message: 'Data Job Trash telah berubah. Muat ulang lalu coba kembali.' };
  const { data: client } = await supabase.from('clients').select('name').eq('id', job.client_id).maybeSingle();
  const confirmation = input.confirmation.trim();
  if (confirmation !== job.title && confirmation !== client?.name) return { ok: false, message: 'Konfirmasi harus sama persis dengan judul Job atau nama client.' };

  try {
    if (folder?.google_folder_id) await deleteDriveFilePermanently(folder.google_folder_id);
  } catch (error) {
    if (!(error instanceof GoogleDriveApiError && error.status === 404)) {
      return { ok: false, message: 'Folder Google Drive gagal dihapus permanen. Data Job belum dihapus.' };
    }
  }

  const { error } = await supabase.rpc('delete_job_permanently', {
    p_job_id: input.jobId,
    p_expected_version: input.version,
    p_confirmation: confirmation,
  });
  if (error) return failure(error, 'Folder Drive telah diproses, tetapi data Job gagal dihapus. Hubungi administrator sistem.');

  refreshJobs(input.jobId);
  return { ok: true, message: 'Job dan folder dokumennya telah dihapus permanen.' };
}
