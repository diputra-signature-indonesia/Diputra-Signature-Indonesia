import 'server-only';

import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import { cacheLife, cacheTag } from 'next/cache';

export type PublicQuestionAnswer = {
  id: string;
  question: string;
  answer: string;
  scope: 'category' | 'global';
};

export async function getPublishedQuestionAnswers(categorySlug?: string): Promise<PublicQuestionAnswer[]> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.questionAnswers);

  const supabase = createSupabasePublicServerClient();
  let categoryId: string | null = null;

  if (categorySlug) {
    const { data: category, error } = await supabase
      .from('services_categories')
      .select('id')
      .eq('slug', categorySlug)
      .eq('is_published', true)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw new Error(`Unable to load Q&A Service category: ${error.message}`);
    categoryId = category?.id ?? null;
  }

  let query = supabase
    .from('question_answer')
    .select('id,services_categories_id,question,answer,sort_order,created_at')
    .eq('is_visible', true)
    .is('deleted_at', null);

  query = categoryId
    ? query.or(`services_categories_id.eq.${categoryId},services_categories_id.is.null`)
    : query.is('services_categories_id', null);

  const { data, error } = await query.order('sort_order').order('created_at').order('id');
  if (error) throw new Error(`Unable to load public Q&A: ${error.message}`);

  return (data ?? [])
    .map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      scope: item.services_categories_id ? ('category' as const) : ('global' as const),
    }))
    .sort((left, right) => Number(right.scope === 'category') - Number(left.scope === 'category'));
}
