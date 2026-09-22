'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type JobDetailActionResult = { ok: true } | { ok: false; message: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function invalid(message = 'Data tidak valid. Muat ulang halaman lalu coba kembali.'): JobDetailActionResult {
  return { ok: false, message };
}

function rpcError(error: { code?: string; message: string }): JobDetailActionResult {
  if (error.code === '42501') return invalid('Anda tidak memiliki izin untuk mengubah Job ini.');
  if (error.code === '40001') return invalid('Data sudah berubah. Muat ulang halaman sebelum mencoba kembali.');
  if (error.code === 'P0002') return invalid('Data tidak ditemukan. Muat ulang halaman.');
  if (error.code === '55000') return invalid(error.message);
  if (error.code === '22023' || error.code === '23503' || error.code === '23514') return invalid(error.message);
  return invalid('Perubahan gagal disimpan. Silakan coba kembali.');
}

function refreshJob(jobId: string) {
  revalidatePath(`/admin/all-jobs/${jobId}`);
  revalidatePath('/admin/all-jobs');
}

export async function changeJobStepAction(input: { jobId: string; stepId: string; version: number; action: 'complete' | 'revert' }): Promise<JobDetailActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || !UUID.test(input.stepId) || !Number.isInteger(input.version) || input.version < 1) return invalid();
  const supabase = await createSupabaseServerClient();
  const { data: step, error: readError } = await supabase.from('job_steps').select('job_id').eq('id', input.stepId).maybeSingle();
  if (readError || step?.job_id !== input.jobId) return invalid();
  const { error } = input.action === 'complete'
    ? await supabase.rpc('complete_job_step', { p_job_step_id: input.stepId, p_expected_version: input.version })
    : await supabase.rpc('revert_last_job_step', { p_job_step_id: input.stepId, p_expected_version: input.version });
  if (error) return rpcError(error);
  refreshJob(input.jobId);
  return { ok: true };
}

export async function changeJobStatusAction(input: { jobId: string; version: number; statusCode: 'IN_PROGRESS' | 'ON_HOLD' | 'OBSTACLE'; reason: string }): Promise<JobDetailActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || !Number.isInteger(input.version) || input.version < 1 || !['IN_PROGRESS', 'ON_HOLD', 'OBSTACLE'].includes(input.statusCode)) return invalid();
  if (input.statusCode !== 'IN_PROGRESS' && !input.reason.trim()) return invalid('Alasan wajib diisi untuk On Hold atau Obstacle.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('change_job_status', {
    p_job_id: input.jobId, p_expected_version: input.version, p_status_code: input.statusCode,
    p_reason: input.reason.trim() || undefined,
  });
  if (error) return rpcError(error);
  refreshJob(input.jobId);
  return { ok: true };
}

export async function reopenJobAction(input: { jobId: string; version: number; reason: string }): Promise<JobDetailActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || !Number.isInteger(input.version) || input.version < 1 || !input.reason.trim()) return invalid('Alasan membuka kembali Job wajib diisi.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('reopen_job', { p_job_id: input.jobId, p_expected_version: input.version, p_reason: input.reason.trim() });
  if (error) return rpcError(error);
  refreshJob(input.jobId);
  return { ok: true };
}

export async function saveJobRemarkAction(input: {
  jobId: string; remarkId?: string; version?: number; message: string; progressDate: string; performedBy: string | null;
}): Promise<JobDetailActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || input.remarkId && (!UUID.test(input.remarkId) || !Number.isInteger(input.version) || (input.version ?? 0) < 1)) return invalid();
  if (!input.message.trim() || input.message.trim().length > 4000) return invalid('Remark wajib diisi (maksimal 4000 karakter).');
  if (!DATE.test(input.progressDate)) return invalid('Tanggal progres wajib dipilih.');
  if (input.performedBy && !UUID.test(input.performedBy)) return invalid('Pelaksana tidak valid.');
  const supabase = await createSupabaseServerClient();
  if (input.remarkId) {
    const { data: remark } = await supabase.from('job_updates').select('job_id').eq('id', input.remarkId).maybeSingle();
    if (remark?.job_id !== input.jobId) return invalid();
  }
  const { error } = input.remarkId
    ? await supabase.rpc('update_job_update', {
        p_update_id: input.remarkId, p_expected_version: input.version!, p_message: input.message.trim(),
        p_progress_date: input.progressDate, p_performed_by: input.performedBy || undefined,
      })
    : await supabase.rpc('create_job_update', {
        p_job_id: input.jobId, p_message: input.message.trim(), p_progress_date: input.progressDate,
        p_performed_by: input.performedBy || undefined,
      });
  if (error) return rpcError(error);
  refreshJob(input.jobId);
  return { ok: true };
}

export async function deleteJobRemarkAction(input: { jobId: string; remarkId: string; version: number }): Promise<JobDetailActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || !UUID.test(input.remarkId) || !Number.isInteger(input.version) || input.version < 1) return invalid();
  const supabase = await createSupabaseServerClient();
  const { data: remark } = await supabase.from('job_updates').select('job_id').eq('id', input.remarkId).maybeSingle();
  if (remark?.job_id !== input.jobId) return invalid();
  const { error } = await supabase.rpc('delete_job_update', { p_update_id: input.remarkId, p_expected_version: input.version });
  if (error) return rpcError(error);
  refreshJob(input.jobId);
  return { ok: true };
}

export async function updateJobAction(input: {
  jobId: string; version: number; clientId: string; title: string; serviceId: string; priorityId: string;
  picId: string; description: string; startDate: string; estimatedEndDate: string;
}): Promise<JobDetailActionResult> {
  const actor = await requireActiveAdmin();
  if (![input.jobId, input.clientId, input.serviceId, input.priorityId].every((value) => UUID.test(value)) ||
    !Number.isInteger(input.version) || input.version < 1) return invalid();
  if (!input.title.trim() || input.title.trim().length > 240) return invalid('Judul Job wajib diisi (maksimal 240 karakter).');
  if (input.description.length > 5000) return invalid('Deskripsi maksimal 5000 karakter.');
  if (input.startDate && !DATE.test(input.startDate) || input.estimatedEndDate && !DATE.test(input.estimatedEndDate) ||
    input.startDate && input.estimatedEndDate && input.estimatedEndDate < input.startDate) return invalid('Urutan tanggal Job tidak valid.');
  const canChangePic = actor.role === 'admin' || actor.role === 'super_admin';
  if (canChangePic && !UUID.test(input.picId)) return invalid('PIC tidak valid.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('update_job', {
    p_job_id: input.jobId, p_expected_version: input.version, p_client_id: input.clientId,
    p_title: input.title.trim(), p_internal_service_id: input.serviceId, p_priority_id: input.priorityId,
    p_pic_id: canChangePic ? input.picId : undefined,
    p_description: input.description.trim() || undefined,
    p_start_date: input.startDate || undefined, p_estimated_end_date: input.estimatedEndDate || undefined,
  });
  if (error) return rpcError(error);
  refreshJob(input.jobId);
  return { ok: true };
}
