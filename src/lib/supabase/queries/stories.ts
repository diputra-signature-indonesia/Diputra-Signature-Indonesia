import { supabase } from '@/lib/supabase/client';

export type StoryExperience = {
  id: string;
  services_category_id: string | null; // nullable ok
  name: string | null;
  message: string | null;
  experience_date: string | null; // date -> string ISO
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

/** LIST stories visible (homepage section) */
export async function getVisibleStories(limit = 6): Promise<StoryExperience[]> {
  const { data, error } = await supabase.from('client_review').select('*').eq('is_visible', true).order('experience_date', { ascending: false }).limit(limit);

  if (error) throw error;
  return (data ?? []) as StoryExperience[];
}

/** LIST stories by category (opsional, kalau nanti dipakai) */
export async function getStoriesByCategoryId(categoryId: string, limit = 20): Promise<StoryExperience[]> {
  const { data, error } = await supabase.from('client_review').select('*').eq('is_visible', true).eq('services_categories_id', categoryId).order('experience_date', { ascending: false }).limit(limit);

  if (error) throw error;
  return (data ?? []) as StoryExperience[];
}
