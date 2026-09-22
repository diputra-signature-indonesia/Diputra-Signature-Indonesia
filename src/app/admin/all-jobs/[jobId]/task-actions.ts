'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type TaskActionResult = { ok: true } | { ok: false; message: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (message: string): TaskActionResult => ({ ok: false, message });

function mapError(error: { code?: string; message: string }): TaskActionResult {
  if (error.code === '42501') return fail('Anda tidak memiliki izin untuk mengubah Task ini.');
  if (error.code === '40001') return fail('Task sudah berubah. Muat ulang halaman sebelum mencoba lagi.');
  if (error.code === 'P0002') return fail('Task tidak ditemukan. Muat ulang halaman.');
  if (['55000', '22023', '23503', '23514'].includes(error.code ?? '')) return fail(error.message);
  return fail('Perubahan Task gagal disimpan. Silakan coba lagi.');
}

function refresh(jobId: string) {
  revalidatePath(`/admin/all-jobs/${jobId}`);
  revalidatePath('/admin/all-jobs');
}

type TaskInput = {
  jobId: string;
  taskId?: string;
  version?: number;
  statusId?: string;
  title: string;
  description: string;
  assigneeId: string | null;
  priorityId: string | null;
  dueDate: string | null;
};

export async function saveTaskAction(input: TaskInput): Promise<TaskActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || input.taskId && !UUID.test(input.taskId) || input.statusId && !UUID.test(input.statusId) ||
    input.assigneeId && !UUID.test(input.assigneeId) || input.priorityId && !UUID.test(input.priorityId) ||
    input.taskId && (!Number.isInteger(input.version) || (input.version ?? 0) < 1)) return fail('Data Task tidak valid.');
  if (!input.title.trim() && !input.description.trim()) return fail('Isi judul atau deskripsi Task.');
  if (input.title.length > 500 || input.description.length > 5000) return fail('Judul atau deskripsi Task terlalu panjang.');
  if (input.dueDate && !DATE.test(input.dueDate)) return fail('Due date tidak valid.');

  const supabase = await createSupabaseServerClient();
  if (input.taskId) {
    const { data: task, error: readError } = await supabase.from('tasks').select('job_id').eq('id', input.taskId).maybeSingle();
    if (readError || task?.job_id !== input.jobId) return fail('Task tidak ditemukan pada Job ini.');
  }
  const { error } = input.taskId
    ? await supabase.rpc('update_task', {
        p_task_id: input.taskId, p_expected_version: input.version!, p_title: input.title.trim(),
        p_description: input.description.trim() || undefined, p_assignee_id: input.assigneeId || undefined,
        p_priority_id: input.priorityId || undefined, p_due_date: input.dueDate || undefined,
      })
    : await supabase.rpc('create_task', {
        p_job_id: input.jobId, p_job_task_status_id: input.statusId, p_title: input.title.trim() || undefined,
        p_description: input.description.trim() || undefined, p_assignee_id: input.assigneeId || undefined,
        p_priority_id: input.priorityId || undefined, p_due_date: input.dueDate || undefined,
      });
  if (error) return mapError(error);
  refresh(input.jobId);
  return { ok: true };
}

export async function moveTaskAction(input: { jobId: string; taskId: string; version: number; statusId: string; beforeTaskId: string | null }): Promise<TaskActionResult> {
  await requireActiveAdmin();
  if (![input.jobId, input.taskId, input.statusId].every((value) => UUID.test(value)) || input.beforeTaskId && !UUID.test(input.beforeTaskId) || !Number.isInteger(input.version) || input.version < 1) return fail('Data Task tidak valid.');
  const supabase = await createSupabaseServerClient();
  const { data: task } = await supabase.from('tasks').select('job_id').eq('id', input.taskId).maybeSingle();
  if (task?.job_id !== input.jobId) return fail('Task tidak ditemukan pada Job ini.');
  const { error } = await supabase.rpc('place_task_on_board', { p_task_id: input.taskId, p_expected_version: input.version, p_job_task_status_id: input.statusId, p_before_task_id: input.beforeTaskId || undefined });
  if (error) return mapError(error);
  refresh(input.jobId);
  return { ok: true };
}

export async function deleteTaskAction(input: { jobId: string; taskId: string; version: number }): Promise<TaskActionResult> {
  await requireActiveAdmin();
  if (![input.jobId, input.taskId].every((value) => UUID.test(value)) || !Number.isInteger(input.version) || input.version < 1) return fail('Data Task tidak valid.');
  const supabase = await createSupabaseServerClient();
  const { data: task } = await supabase.from('tasks').select('job_id').eq('id', input.taskId).maybeSingle();
  if (task?.job_id !== input.jobId) return fail('Task tidak ditemukan pada Job ini.');
  const { error } = await supabase.rpc('delete_task', { p_task_id: input.taskId, p_expected_version: input.version });
  if (error) return mapError(error);
  refresh(input.jobId);
  return { ok: true };
}

export async function configureTaskColumnsAction(input: { jobId: string; statusIds: string[] }): Promise<TaskActionResult> {
  const actor = await requireActiveAdmin();
  if (!UUID.test(input.jobId) || !input.statusIds.length || input.statusIds.some((id) => !UUID.test(id)) || new Set(input.statusIds).size !== input.statusIds.length) return fail('Daftar status tidak valid.');
  const supabase = await createSupabaseServerClient();
  const { data: job } = await supabase.from('jobs').select('pic_id').eq('id', input.jobId).maybeSingle();
  if (!job || actor.role !== 'admin' && actor.role !== 'super_admin' && job.pic_id !== actor.userId) return fail('Hanya PIC atau admin yang dapat mengatur kolom.');
  const { error } = await supabase.rpc('configure_job_task_statuses', { p_job_id: input.jobId, p_statuses: input.statusIds.map((task_status_id) => ({ task_status_id })) });
  if (error) return mapError(error);
  refresh(input.jobId);
  return { ok: true };
}
