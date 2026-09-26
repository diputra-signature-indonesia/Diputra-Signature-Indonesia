'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ReviewModerationStatus } from '@/types/admin-review';
import { revalidatePath, updateTag } from 'next/cache';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ReviewActionResult = { ok: true; message: string; urlPath?: string } | { ok: false; message: string };
export type CreateReviewRequestInput = {
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  jobId: string | null;
  expiresInDays: number;
};

function reviewErrorMessage(code?: string) {
  if (code === '42501') return 'Akun tidak memiliki izin untuk melakukan tindakan ini.';
  if (code === 'P0002') return 'Data Review tidak ditemukan atau sudah tidak tersedia.';
  if (code === '23503') return 'Client atau Job yang dipilih sudah tidak tersedia.';
  if (code === '22023') return 'Data yang dikirim tidak valid. Periksa kembali form.';
  return 'Tindakan gagal diproses. Silakan coba lagi.';
}

function refreshReviews() {
  revalidatePath('/admin/reviews');
}

export async function createReviewRequestAction(input: CreateReviewRequestInput): Promise<ReviewActionResult> {
  await requireActiveAdmin();
  const clientName = input.clientName?.trim() ?? '';
  const clientEmail = input.clientEmail?.trim() ?? '';
  const clientId = input.clientId || null;
  const jobId = input.jobId || null;
  if (clientId && !UUID_PATTERN.test(clientId)) return { ok: false, message: 'Client tidak valid.' };
  if (jobId && !UUID_PATTERN.test(jobId)) return { ok: false, message: 'Job tidak valid.' };
  if (jobId && !clientId) return { ok: false, message: 'Job hanya dapat dipilih bersama Client terdaftar.' };
  if (!clientId && (!clientName || clientName.length > 200)) return { ok: false, message: 'Nama Client wajib diisi (maksimal 200 karakter).' };
  if (clientEmail && (clientEmail.length > 254 || !EMAIL_PATTERN.test(clientEmail))) return { ok: false, message: 'Format email Client tidak valid.' };
  if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 90) return { ok: false, message: 'Masa berlaku harus antara 1 dan 90 hari.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_review_request', {
    p_client_id: clientId ?? undefined,
    p_client_name: clientId ? undefined : clientName,
    p_client_email: clientEmail || undefined,
    p_job_id: jobId ?? undefined,
    p_expires_in_days: input.expiresInDays,
  });
  if (error || !data?.[0]?.token) return { ok: false, message: reviewErrorMessage(error?.code) };
  refreshReviews();
  return { ok: true, message: 'Tautan Review berhasil dibuat.', urlPath: `/review-request/${data[0].token}` };
}

export async function moderateReviewAction(id: string, status: Exclude<ReviewModerationStatus, 'ARCHIVED'>, isFeatured: boolean): Promise<ReviewActionResult> {
  await requireActiveAdmin();
  if (!UUID_PATTERN.test(id) || !['PENDING', 'PUBLISHED', 'REJECTED'].includes(status)) return { ok: false, message: 'Review tidak valid.' };
  if (status !== 'PUBLISHED' && isFeatured) return { ok: false, message: 'Hanya Review published yang dapat dijadikan featured.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('moderate_review', { p_review_id: id, p_status: status, p_is_featured: isFeatured });
  if (error) return { ok: false, message: reviewErrorMessage(error.code) };
  updateTag(PUBLIC_CACHE_TAGS.reviews);
  refreshReviews();
  return { ok: true, message: 'Status Review berhasil diperbarui.' };
}

export async function archiveReviewAction(id: string): Promise<ReviewActionResult> {
  await requireActiveAdmin();
  if (!UUID_PATTERN.test(id)) return { ok: false, message: 'Review tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('archive_review', { p_review_id: id });
  if (error) return { ok: false, message: reviewErrorMessage(error.code) };
  updateTag(PUBLIC_CACHE_TAGS.reviews);
  refreshReviews();
  return { ok: true, message: 'Review berhasil diarsipkan.' };
}

export async function revokeReviewRequestAction(id: string): Promise<ReviewActionResult> {
  await requireActiveAdmin();
  if (!UUID_PATTERN.test(id)) return { ok: false, message: 'Review link tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('revoke_review_request', { p_request_id: id });
  if (error) return { ok: false, message: reviewErrorMessage(error.code) };
  refreshReviews();
  return { ok: true, message: 'Review link berhasil dicabut.' };
}

export async function archiveReviewRequestAction(id: string): Promise<ReviewActionResult> {
  await requireActiveAdmin();
  if (!UUID_PATTERN.test(id)) return { ok: false, message: 'Review link tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('archive_review_request', { p_request_id: id });
  if (error) return { ok: false, message: reviewErrorMessage(error.code) };
  refreshReviews();
  return { ok: true, message: 'Riwayat Review link berhasil diarsipkan.' };
}
