import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import type { Tables } from '@/types/database.generated';
import { cacheLife, cacheTag } from 'next/cache';

type ReviewRecord = Tables<'reviews'>;

export type StoryExperience = Pick<ReviewRecord, 'id' | 'name' | 'message' | 'created_at'>;
export type DefaultReview = ReviewRecord;
export type DefaultGeneratedUrl = Tables<'review_requests'>;

/** LIST stories visible (homepage section) */
export async function getVisibleStories(limit = 6): Promise<StoryExperience[]> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.reviews);

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase.from('reviews').select('id, name, message, created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getAdminClientStories(limit = 6): Promise<DefaultReview[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getAdminGeneratedReview(limit = 6): Promise<DefaultGeneratedUrl[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('review_requests').select('*').order('created_at', { ascending: false }).limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** LIST stories by category (opsional, kalau nanti dipakai) */
// export async function getStoriesByCategoryId(categoryId: string, limit = 20): Promise<StoryExperience[]> {
//   const supabase = await createSupabaseServerClient();
//   const { data, error } = await supabase.from('reviews').select('*').eq('is_published', true).eq('services_categories_id', categoryId).order('experience_date', { ascending: false }).limit(limit);

//   if (error) throw error;
//   return (data ?? []) as StoryExperience[];
// }
