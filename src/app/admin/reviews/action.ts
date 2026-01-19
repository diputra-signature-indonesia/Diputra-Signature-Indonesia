'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function setReviewPublishedAction(id: string, isPublished: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('reviews').update({ is_published: isPublished }).eq('id', id);
  if (error) throw error;
}

export async function setReviewFeaturedAction(id: string, isFeatured: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('reviews').update({ is_featured: isFeatured }).eq('id', id);
  if (error) throw error;
}

export async function deleteReviewAction(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}
