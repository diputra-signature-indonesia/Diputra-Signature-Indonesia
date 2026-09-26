'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { articlePlainText, sanitizeArticleHtml } from '@/lib/blog-content';
import { PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BlogEditorInput, BlogStatus } from '@/types/admin-blog';
import { updateTag } from 'next/cache';
import { revalidatePath } from 'next/cache';

type ActionResult = { ok: boolean; message: string; slug?: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeInput(input: BlogEditorInput): BlogEditorInput {
  return {
    title: input.title.trim().slice(0, 200),
    excerpt: input.excerpt.trim().slice(0, 500),
    contentHtml: sanitizeArticleHtml(input.contentHtml),
    readingTimeMinutes: Math.min(120, Math.max(1, Math.trunc(input.readingTimeMinutes) || 1)),
    featuredImage: input.featuredImage?.trim() || null,
    coverAlt: input.coverAlt?.trim().slice(0, 200) || null,
    category: input.category.trim().slice(0, 80) || 'News',
    tags: Array.from(new Set(input.tags.map((tag) => tag.trim().slice(0, 40)).filter(Boolean))).slice(0, 10),
    seoTitle: input.seoTitle?.trim().slice(0, 70) || null,
    seoDescription: input.seoDescription?.trim().slice(0, 180) || null,
  };
}

function validateInput(input: BlogEditorInput): string | null {
  if (input.title.length < 5) return 'Judul minimal 5 karakter.';
  if (input.excerpt.length < 10) return 'Ringkasan minimal 10 karakter.';
  if (articlePlainText(input.contentHtml).length < 10) return 'Isi artikel masih terlalu pendek.';
  if (input.contentHtml.length > 300_000) return 'Isi artikel terlalu besar. Maksimal 300.000 karakter HTML.';
  const images = input.contentHtml.match(/<img\b[^>]*>/gi) ?? [];
  if (images.some((image) => !/\balt\s*=\s*(["'])[^"']+\1/i.test(image))) return 'Setiap gambar di dalam artikel wajib memiliki alt text.';
  if (!input.category) return 'Kategori wajib diisi.';
  return null;
}

function friendlyError(message: string) {
  if (message.includes('blog_post_stale') || message.includes('blog_post_unavailable_or_stale')) return 'Artikel telah diperbarui di tab lain. Muat ulang halaman sebelum mencoba lagi.';
  if (message.includes('blog_edit_forbidden')) return 'Anda tidak memiliki izin mengedit artikel ini.';
  if (message.includes('blog_moderation_forbidden')) return 'Hanya admin yang dapat memoderasi artikel.';
  if (message.includes('blog_rejection_reason_required')) return 'Alasan revisi wajib diisi.';
  if (message.includes('blog_cover_required')) return 'Cover image wajib diunggah sebelum artikel direview atau dipublikasikan.';
  if (message.includes('blog_cover_alt_required')) return 'Alt text cover wajib diisi.';
  if (message.includes('blog_seo_metadata_required')) return 'SEO title dan SEO description wajib lengkap sebelum publikasi.';
  if (message.includes('blog_revision_not_found')) return 'Versi artikel yang dipilih tidak ditemukan.';
  if (message.includes('duplicate key')) return 'Slug artikel sudah digunakan.';
  return message;
}

function refreshBlogPaths(slug?: string) {
  revalidatePath('/admin/blog');
  if (slug) {
    revalidatePath(`/admin/blog/${slug}/edit`);
    revalidatePath(`/admin/blog/preview/${slug}`);
    revalidatePath(`/blog/${slug}`);
  }
  revalidatePath('/blog');
  updateTag(PUBLIC_CACHE_TAGS.blog);
}

export async function createBlogPostAction(input: BlogEditorInput, submitForReview = false): Promise<ActionResult> {
  await requireActiveAdmin();
  const normalized = normalizeInput(input);
  const invalid = validateInput(normalized);
  if (invalid) return { ok: false, message: invalid };
  if (submitForReview && !normalized.featuredImage) return { ok: false, message: 'Cover image wajib diunggah sebelum artikel dikirim untuk review.' };
  const supabase = await createSupabaseServerClient();

  const { data: postId, error } = await supabase.rpc('create_blog_post', {
    p_title: normalized.title,
    p_excerpt: normalized.excerpt,
    p_content_html: normalized.contentHtml,
    p_reading_time_min: normalized.readingTimeMinutes,
    p_featured_image: normalized.featuredImage ?? undefined,
    p_cover_alt: normalized.coverAlt ?? undefined,
    p_category: normalized.category,
    p_tags: normalized.tags,
    p_seo_title: normalized.seoTitle ?? undefined,
    p_seo_description: normalized.seoDescription ?? undefined,
  });
  if (error || !postId) return { ok: false, message: friendlyError(error?.message ?? 'Artikel gagal dibuat.') };

  const { data: post, error: postError } = await supabase.from('blog_posts').select('slug, version').eq('id', postId).single();
  if (postError || !post) return { ok: false, message: 'Artikel tersimpan, tetapi hasilnya tidak dapat dimuat.' };

  if (submitForReview) {
    const { error: submitError } = await supabase.rpc('submit_blog_post_for_review', { p_post_id: postId, p_expected_version: post.version });
    if (submitError) return { ok: false, message: `Draft tersimpan, tetapi gagal dikirim untuk review: ${friendlyError(submitError.message)}`, slug: post.slug };
  }

  refreshBlogPaths(post.slug);
  return { ok: true, message: submitForReview ? 'Artikel disimpan dan dikirim untuk review.' : 'Draft artikel berhasil disimpan.', slug: post.slug };
}

export async function updateBlogPostAction(postId: string, expectedVersion: number, input: BlogEditorInput, submitForReview = false): Promise<ActionResult> {
  await requireActiveAdmin();
  if (!isUuid(postId) || !Number.isInteger(expectedVersion) || expectedVersion < 1) return { ok: false, message: 'Data artikel tidak valid.' };
  const normalized = normalizeInput(input);
  const invalid = validateInput(normalized);
  if (invalid) return { ok: false, message: invalid };
  if (submitForReview && !normalized.featuredImage) return { ok: false, message: 'Cover image wajib diunggah sebelum artikel dikirim untuk review.' };
  const supabase = await createSupabaseServerClient();

  const { data: nextVersion, error } = await supabase.rpc('update_blog_post', {
    p_post_id: postId,
    p_expected_version: expectedVersion,
    p_title: normalized.title,
    p_excerpt: normalized.excerpt,
    p_content_html: normalized.contentHtml,
    p_reading_time_min: normalized.readingTimeMinutes,
    p_featured_image: normalized.featuredImage ?? undefined,
    p_cover_alt: normalized.coverAlt ?? undefined,
    p_category: normalized.category,
    p_tags: normalized.tags,
    p_seo_title: normalized.seoTitle ?? undefined,
    p_seo_description: normalized.seoDescription ?? undefined,
  });
  if (error || !nextVersion) return { ok: false, message: friendlyError(error?.message ?? 'Artikel gagal diperbarui.') };

  const { data: post } = await supabase.from('blog_posts').select('slug').eq('id', postId).single();
  if (submitForReview) {
    const { error: submitError } = await supabase.rpc('submit_blog_post_for_review', { p_post_id: postId, p_expected_version: nextVersion });
    if (submitError) return { ok: false, message: `Perubahan tersimpan, tetapi gagal dikirim untuk review: ${friendlyError(submitError.message)}`, slug: post?.slug };
  }

  refreshBlogPaths(post?.slug);
  return { ok: true, message: submitForReview ? 'Perubahan disimpan dan dikirim untuk review.' : 'Perubahan artikel berhasil disimpan.', slug: post?.slug };
}

export async function submitBlogPostAction(postId: string, expectedVersion: number): Promise<ActionResult> {
  await requireActiveAdmin();
  if (!isUuid(postId)) return { ok: false, message: 'Artikel tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('submit_blog_post_for_review', { p_post_id: postId, p_expected_version: expectedVersion });
  if (error) return { ok: false, message: friendlyError(error.message) };
  refreshBlogPaths();
  return { ok: true, message: 'Artikel dikirim untuk review.' };
}

export async function moderateBlogPostAction(postId: string, expectedVersion: number, status: Extract<BlogStatus, 'draft' | 'published' | 'rejected'>, reason?: string): Promise<ActionResult> {
  const actor = await requireActiveAdmin();
  if (!['admin', 'super_admin'].includes(actor.role)) return { ok: false, message: 'Hanya admin yang dapat memoderasi artikel.' };
  if (!isUuid(postId)) return { ok: false, message: 'Artikel tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('moderate_blog_post', {
    p_post_id: postId,
    p_expected_version: expectedVersion,
    p_status: status,
    p_rejection_reason: reason?.trim() || undefined,
  });
  if (error) return { ok: false, message: friendlyError(error.message) };
  refreshBlogPaths();
  return { ok: true, message: status === 'published' ? 'Artikel berhasil dipublikasikan.' : status === 'rejected' ? 'Artikel dikembalikan untuk revisi.' : 'Artikel dikembalikan menjadi draft.' };
}

export async function setBlogFeaturedAction(postId: string, expectedVersion: number, featured: boolean): Promise<ActionResult> {
  const actor = await requireActiveAdmin();
  if (!['admin', 'super_admin'].includes(actor.role)) return { ok: false, message: 'Hanya admin yang dapat mengatur featured article.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_blog_post_featured', { p_post_id: postId, p_expected_version: expectedVersion, p_is_featured: featured });
  if (error) return { ok: false, message: friendlyError(error.message) };
  refreshBlogPaths();
  return { ok: true, message: featured ? 'Artikel ditandai sebagai featured.' : 'Featured article dinonaktifkan.' };
}

export async function archiveBlogPostAction(postId: string, expectedVersion: number): Promise<ActionResult> {
  const actor = await requireActiveAdmin();
  if (!['admin', 'super_admin'].includes(actor.role)) return { ok: false, message: 'Hanya admin yang dapat mengarsipkan artikel.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('archive_blog_post', { p_post_id: postId, p_expected_version: expectedVersion });
  if (error) return { ok: false, message: friendlyError(error.message) };
  refreshBlogPaths();
  return { ok: true, message: 'Artikel dipindahkan ke arsip.' };
}

export async function restoreBlogPostAction(postId: string, expectedVersion: number): Promise<ActionResult> {
  const actor = await requireActiveAdmin();
  if (!['admin', 'super_admin'].includes(actor.role)) return { ok: false, message: 'Hanya admin yang dapat memulihkan artikel.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('restore_blog_post', { p_post_id: postId, p_expected_version: expectedVersion });
  if (error) return { ok: false, message: friendlyError(error.message) };
  refreshBlogPaths();
  return { ok: true, message: 'Artikel dipulihkan sebagai draft.' };
}

export async function restoreBlogRevisionAction(postId: string, revisionId: number, expectedVersion: number): Promise<ActionResult> {
  await requireActiveAdmin();
  if (!isUuid(postId) || !Number.isSafeInteger(revisionId) || revisionId < 1 || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, message: 'Versi artikel tidak valid.' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('restore_blog_post_revision', {
    p_post_id: postId,
    p_revision_id: revisionId,
    p_expected_version: expectedVersion,
  });
  if (error) return { ok: false, message: friendlyError(error.message) };
  const { data: post } = await supabase.from('blog_posts').select('slug').eq('id', postId).single();
  refreshBlogPaths(post?.slug);
  return { ok: true, message: 'Versi artikel berhasil dipulihkan sebagai draft.', slug: post?.slug };
}
