import { createSupabaseServerClient } from '@/lib/supabase/server';
export type StoryExperience = {
  id: string;
  name: string | null;
  message: string | null;
  is_published: boolean | null;
  created_at: string | null;
};

export type DefaultReview = {
  id: string;
  name: string | null;
  email: string | null;
  message: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string | null;
};

export type DefaultGeneratedUrl = {
  id: string;
  token_hash: string | null;
  client_name: string | null;
  client_email: string | null;
  expires_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
};

/** LIST stories visible (homepage section) */
export async function getVisibleStories(limit = 6): Promise<StoryExperience[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('reviews').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(limit);

  if (error) throw error;
  return (data ?? []) as StoryExperience[];
}

export async function getAdminClientStories(limit = 6): Promise<DefaultReview[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(limit);

  if (error) throw error;
  return (data ?? []) as DefaultReview[];
}

export async function getAdminGeneratedReview(limit = 6): Promise<DefaultGeneratedUrl[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('review_requests').select('*').order('created_at', { ascending: false }).limit(limit);

  if (error) throw error;
  return (data ?? []) as DefaultGeneratedUrl[];
}

/** LIST stories by category (opsional, kalau nanti dipakai) */
// export async function getStoriesByCategoryId(categoryId: string, limit = 20): Promise<StoryExperience[]> {
//   const supabase = await createSupabaseServerClient();
//   const { data, error } = await supabase.from('reviews').select('*').eq('is_published', true).eq('services_categories_id', categoryId).order('experience_date', { ascending: false }).limit(limit);

//   if (error) throw error;
//   return (data ?? []) as StoryExperience[];
// }
