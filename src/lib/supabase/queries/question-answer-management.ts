import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type AdminQuestionAnswer = Pick<
  Tables<'question_answer'>,
  'id' | 'services_categories_id' | 'question' | 'answer' | 'is_visible' | 'sort_order' | 'version' | 'created_at' | 'updated_at'
>;

export type QuestionAnswerCategory = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
};

export async function getQuestionAnswerManagementData() {
  const supabase = await createSupabaseServerClient();
  const [items, categories] = await Promise.all([
    supabase
      .from('question_answer')
      .select('id,services_categories_id,question,answer,is_visible,sort_order,version,created_at,updated_at')
      .is('deleted_at', null)
      .order('sort_order')
      .order('created_at')
      .order('id'),
    supabase.rpc('list_question_answer_categories'),
  ]);

  if (items.error) throw new Error(`Unable to load Q&A entries: ${items.error.message}`);
  if (categories.error) throw new Error(`Unable to load Q&A Service categories: ${categories.error.message}`);

  return {
    items: items.data ?? [],
    categories: (categories.data ?? []) as QuestionAnswerCategory[],
  };
}
