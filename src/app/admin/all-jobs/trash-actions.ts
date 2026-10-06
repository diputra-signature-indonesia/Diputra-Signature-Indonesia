'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { deleteJobPermanently } from '@/lib/supabase/permanent-deletion';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type JobTrashActionResult = { ok: true; message: string } | { ok: false; message: string };
export type JobDeletionImpact = {
  title: string;
  pending: boolean;
  tasks: number;
  steps: number;
  statuses: number;
  remarks: number;
  contributors: number;
  logs: number;
  documents: number;
  folders: number;
  groups: number;
  reviews: number;
  unusedReviewLinks: number;
};
function refreshJobs(jobId: string) {
  revalidatePath('/admin/all-jobs');
  revalidatePath('/admin/my-tasks');
  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/all-jobs/${jobId}`);
}
function failure(error: { code?: string; message: string }, fallback: string): { ok: false; message: string } {
  if (error.code === '42501') return { ok: false, message: 'Hanya admin aktif yang dapat menghapus Job.' };
  if (error.code === '40001' || error.code === 'P0002') return { ok: false, message: 'Job sudah berubah atau tidak ditemukan. Muat ulang data sebelum mencoba kembali.' };
  if (error.code === '22023') return { ok: false, message: 'Konfirmasi harus sama persis dengan judul Job.' };
  return { ok: false, message: fallback };
}
export async function loadJobDeletionImpact(input: { jobId: string; version: number }): Promise<{ ok: true; data: JobDeletionImpact } | { ok: false; message: string }> {
  const actor = await requireActiveAdmin();
  if (actor.role !== 'admin' && actor.role !== 'super_admin') return { ok: false, message: 'Hanya admin yang dapat menghapus Job.' };
  if (!UUID.test(input.jobId) || !Number.isInteger(input.version) || input.version < 1) return { ok: false, message: 'Job tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const result = await supabase.rpc('job_deletion_impact', { p_job_id: input.jobId, p_expected_version: input.version });
  if (result.error) return failure(result.error, 'Dampak penghapusan gagal dimuat.');
  if (!result.data) return { ok: false, message: 'Dampak penghapusan tidak tersedia.' };
  return { ok: true, data: result.data as unknown as JobDeletionImpact };
}
export async function permanentlyDeleteJobAction(input: { jobId: string; version: number; confirmation: string }): Promise<JobTrashActionResult> {
  const actor = await requireActiveAdmin();
  if (actor.role !== 'admin' && actor.role !== 'super_admin') return { ok: false, message: 'Hanya admin yang dapat menghapus permanen Job.' };
  if (!UUID.test(input.jobId) || !Number.isInteger(input.version) || input.version < 1 || !input.confirmation) return { ok: false, message: 'Data konfirmasi penghapusan tidak valid.' };
  try {
    const result = await deleteJobPermanently(input, actor.userId);
    refreshJobs(input.jobId);
    if (result.error) return failure(result.error, 'Pembersihan belum selesai. Job tetap terkunci; gunakan Delete permanently lagi untuk melanjutkan.');
    return { ok: true, message: 'Job, task, histori operasional, dan dokumen Drive berhasil dihapus permanen. Review tetap disimpan.' };
  } catch {
    refreshJobs(input.jobId);
    return {
      ok: false,
      message:
        'Penghapusan belum selesai. Jika proses sudah dimulai, Job tetap terkunci. Gunakan Delete permanently lagi untuk melanjutkan; periksa konfigurasi dan akses Manager service account di Drive. Jangan memulihkan Job yang sedang dihapus.',
    };
  }
}
