'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ContributorActionResult = { ok: true } | { ok: false; message: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string): ContributorActionResult => ({ ok: false, message });

function messageFor(error: { code?: string; message: string }) {
  if (error.code === '42501') return 'Anda tidak memiliki izin untuk mengelola contributor Job ini.';
  if (error.code === 'P0002') return 'Contributor tidak ditemukan.';
  if (['23503', '55000'].includes(error.code ?? '')) return error.message;
  return 'Contributor gagal diperbarui. Silakan coba lagi.';
}

function refresh(jobId: string) {
  revalidatePath(`/admin/all-jobs/${jobId}`);
  revalidatePath('/admin/my-tasks');
}

export async function addJobContributorAction(input: { jobId: string; profileId: string }): Promise<ContributorActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || !UUID.test(input.profileId)) return fail('Data contributor tidak valid.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('add_job_contributor', { p_job_id: input.jobId, p_profile_id: input.profileId });
  if (error) return fail(messageFor(error));
  refresh(input.jobId);
  return { ok: true };
}

export async function removeJobContributorAction(input: { jobId: string; profileId: string }): Promise<ContributorActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.jobId) || !UUID.test(input.profileId)) return fail('Data contributor tidak valid.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('remove_job_contributor', { p_job_id: input.jobId, p_profile_id: input.profileId });
  if (error) return fail(messageFor(error));
  refresh(input.jobId);
  return { ok: true };
}
