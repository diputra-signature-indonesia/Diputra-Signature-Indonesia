'use server';

import { createDraftBlogPost, DefaultInputBlogPost, UpdateBlogInput, updateEditedBlogPost } from '@/lib/supabase/queries/blog';

export async function saveDraftBlogAction(payload: DefaultInputBlogPost) {
  return await createDraftBlogPost({
    slug: payload.slug,
    title: payload.title,
    excerpt: payload.excerpt,
    content_md: payload.content_md,
    author_name: payload.author_name,
    reading_time_min: payload.reading_time_min,
    featured_image: payload.featured_image,
    cover_alt: payload.title || null,
    seo_title: payload.title || null,
    seo_description: payload.excerpt || null,
    og_image: payload.featured_image,
  });
}

export async function updateBlogPostAction(id: string, payload: UpdateBlogInput) {
  return await updateEditedBlogPost(id, {
    title: payload.title,
    excerpt: payload.excerpt,
    content_md: payload.content_md,
    reading_time_min: payload.reading_time_min,
    featured_image: payload.featured_image,
    cover_alt: payload.title || null,
    seo_title: payload.title || null,
    seo_description: payload.excerpt || null,
    og_image: payload.featured_image,
  });
}
