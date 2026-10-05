import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type AdminQuestionAnswer = Pick<Tables<'question_answer'>, 'id' | 'services_categories_id' | 'question' | 'answer' | 'is_visible' | 'sort_order' | 'version' | 'created_at' | 'updated_at'>;

export type QuestionAnswerCategory = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
};

export async function getQuestionAnswerManagementData(categoryId: string, signal?: AbortSignal) {
  const supabase = await createSupabaseServerClient();
  const request = supabase
    .from('question_answer')
    .select('id,services_categories_id,question,answer,is_visible,sort_order,version,created_at,updated_at')
    .is('deleted_at', null)
    .or(`services_categories_id.eq.${categoryId},services_categories_id.is.null`)
    .order('sort_order')
    .order('created_at')
    .order('id');
  // Reordering requires the complete selected scope, never the entire catalogue.
  const items = await (signal ? request.abortSignal(signal) : request);

  if (items.error) throw new Error(`Unable to load Q&A entries: ${items.error.message}`);

  return {
    items: items.data ?? [],
  };
}
