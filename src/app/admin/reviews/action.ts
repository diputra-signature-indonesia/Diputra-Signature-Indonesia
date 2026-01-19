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

export async function revokeReviewRequestAction(id: string) {
  const supabase = await createSupabaseServerClient();

  // revoke hanya kalau belum used & belum revoked
  const { error } = await supabase.from('review_requests').update({ revoked_at: new Date().toISOString() }).eq('id', id).is('used_at', null).is('revoked_at', null);

  if (error) throw error;
}

export async function deleteReviewRequestAction(id: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('review_requests').delete().eq('id', id);

  if (error) throw error;
}
