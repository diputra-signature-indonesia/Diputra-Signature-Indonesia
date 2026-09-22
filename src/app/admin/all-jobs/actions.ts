'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type CreateJobInput = {
  clientId: string;
  newClientType: 'COMPANY' | 'INDIVIDUAL' | null;
  newClientName: string;
  title: string;
  serviceId: string;
  priorityId: string;
  picId: string | null;
  description: string;
  startDate: string;
  estimatedEndDate: string;
};

export type CreateJobResult = { ok: true; jobId: string } | { ok: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createJobAction(input: CreateJobInput): Promise<CreateJobResult> {
  const actor = await requireActiveAdmin();
  const title = input.title?.trim() ?? '';
  const description = input.description?.trim() ?? '';
  if (!title || title.length > 240) return { ok: false, message: 'Judul Job wajib diisi (maksimal 240 karakter).' };
  if (description.length > 5000) return { ok: false, message: 'Deskripsi maksimal 5000 karakter.' };
  const createClient = input.clientId === 'new';
  if (![input.serviceId, input.priorityId].every((id) => UUID_PATTERN.test(id)) || !createClient && !UUID_PATTERN.test(input.clientId)) {
    return { ok: false, message: 'Client, Internal Service, dan Priority wajib dipilih.' };
  }
  if (createClient && (!['COMPANY', 'INDIVIDUAL'].includes(input.newClientType ?? '') || !input.newClientName?.trim() || input.newClientName.trim().length > 200)) {
    return { ok: false, message: 'Jenis dan nama Client baru wajib diisi (maksimal 200 karakter).' };
  }
  if (input.startDate && !DATE_PATTERN.test(input.startDate) || input.estimatedEndDate && !DATE_PATTERN.test(input.estimatedEndDate)) {
    return { ok: false, message: 'Format tanggal tidak valid.' };
  }
  if (input.startDate && input.estimatedEndDate && input.estimatedEndDate < input.startDate) {
    return { ok: false, message: 'Estimasi selesai tidak boleh sebelum tanggal mulai.' };
  }

  const canAssignPic = actor.role === 'admin' || actor.role === 'super_admin';
  if (canAssignPic && input.picId && !UUID_PATTERN.test(input.picId)) return { ok: false, message: 'PIC tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const jobArgs = {
    p_title: title,
    p_internal_service_id: input.serviceId,
    p_priority_id: input.priorityId,
    p_pic_id: canAssignPic ? input.picId || actor.userId : actor.userId,
    p_description: description || undefined,
    p_start_date: input.startDate || undefined,
    p_estimated_end_date: input.estimatedEndDate || undefined,
  };
  const { data, error } = createClient
    ? await supabase.rpc('create_job_with_client', {
        ...jobArgs,
        p_client_type: input.newClientType!,
        p_client_name: input.newClientName.trim(),
      })
    : await supabase.rpc('create_job', { ...jobArgs, p_client_id: input.clientId });

  if (error) {
    if (error.code === '23503') return { ok: false, message: 'Pilihan Client, Service/Workflow, Priority, atau PIC tidak lagi tersedia. Muat ulang halaman.' };
    if (error.code === '42501') return { ok: false, message: 'Akun tidak memiliki izin membuat Job.' };
    if (error.code === '22023') return { ok: false, message: 'Periksa kembali urutan tanggal Job.' };
    return { ok: false, message: 'Job gagal disimpan. Periksa data dan coba lagi.' };
  }

  revalidatePath('/admin/all-jobs');
  return { ok: true, jobId: data };
}
