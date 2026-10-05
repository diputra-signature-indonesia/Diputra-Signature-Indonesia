'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath, updateTag } from 'next/cache';

export type QuestionAnswerActionResult = { ok: true; message: string } | { ok: false; message: string };
export type SaveQuestionAnswerInput = {
  id?: string;
  expectedVersion?: number;
  categoryId: string | null;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refreshQuestionAnswers() {
  revalidatePath('/admin/public-services');
  revalidatePath('/');
  revalidatePath('/services', 'layout');
  updateTag(PUBLIC_CACHE_TAGS.questionAnswers);
}

function mutationError(error: { code?: string; message: string }): QuestionAnswerActionResult {
  if (error.code === '42501') return { ok: false, message: 'Akun Anda tidak memiliki akses aktif untuk mengelola Q&A.' };
  if (error.code === '40001') return { ok: false, message: 'Q&A telah berubah. Muat ulang halaman lalu coba kembali.' };
  if (error.code === '23503') return { ok: false, message: 'Service category tidak ditemukan atau sudah dihapus.' };
  if (error.code === 'P0002') return { ok: false, message: 'Q&A tidak ditemukan.' };
  if (['22023', '23514'].includes(error.code ?? '')) return { ok: false, message: error.message };
  return { ok: false, message: 'Perubahan Q&A gagal disimpan. Silakan coba lagi.' };
}

export async function saveQuestionAnswerAction(input: SaveQuestionAnswerInput): Promise<QuestionAnswerActionResult> {
  await requireActiveAdmin();
  const question = input.question.trim();
  const answer = input.answer.trim();
  const validIdentity = !input.id || (UUID.test(input.id) && Number.isInteger(input.expectedVersion) && (input.expectedVersion ?? 0) > 0);
  if (!validIdentity || input.categoryId && !UUID.test(input.categoryId) || !question || question.length > 500 || !answer || answer.length > 10000 || !Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) {
    return { ok: false, message: 'Pertanyaan, jawaban, kategori, urutan, atau versi Q&A tidak valid.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('save_question_answer', {
    p_id: input.id ?? null,
    p_expected_version: input.expectedVersion ?? null,
    p_question: question,
    p_answer: answer,
    p_services_categories_id: input.categoryId,
    p_is_visible: input.isVisible,
    p_sort_order: input.sortOrder,
  } as never);
  if (error) return mutationError(error);
  refreshQuestionAnswers();
  return { ok: true, message: input.id ? 'Q&A berhasil diperbarui.' : 'Q&A berhasil ditambahkan.' };
}

export async function deleteQuestionAnswerAction(input: { id: string; expectedVersion: number }): Promise<QuestionAnswerActionResult> {
  await requireActiveAdmin();
  if (!UUID.test(input.id) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) return { ok: false, message: 'Data Q&A tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('delete_question_answer', { p_id: input.id, p_expected_version: input.expectedVersion });
  if (error) return mutationError(error);
  refreshQuestionAnswers();
  return { ok: true, message: 'Q&A berhasil dihapus.' };
}

export async function reorderQuestionAnswersAction(input: { categoryId: string | null; orderedIds: string[] }): Promise<QuestionAnswerActionResult> {
  await requireActiveAdmin();
  if (input.categoryId && !UUID.test(input.categoryId) || input.orderedIds.some((id) => !UUID.test(id)) || new Set(input.orderedIds).size !== input.orderedIds.length) {
    return { ok: false, message: 'Urutan Q&A tidak valid.' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('reorder_question_answers', { p_services_categories_id: input.categoryId, p_ordered_ids: input.orderedIds } as never);
  if (error) return mutationError(error);
  refreshQuestionAnswers();
  return { ok: true, message: 'Urutan Q&A berhasil diperbarui.' };
}
