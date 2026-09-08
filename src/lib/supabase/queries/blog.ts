import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import type { Tables } from '@/types/database.generated';
import { cacheLife, cacheTag } from 'next/cache';

type BlogPostRecord = Tables<'blog_posts'>;

export type BlogPost = Pick<BlogPostRecord, 'id' | 'title' | 'slug' | 'excerpt' | 'status' | 'created_at' | 'updated_at'>;

export type BlogPostSummary = Pick<BlogPostRecord, 'slug' | 'title' | 'excerpt' | 'featured_image' | 'published_at'>;

export type PublishedBlogPost = Pick<BlogPostRecord, 'slug' | 'title' | 'excerpt' | 'content_md' | 'author_name' | 'featured_image' | 'published_at' | 'updated_at'>;

export type AdminBlogPostPreview = Pick<
  BlogPostRecord,
  'id' | 'title' | 'slug' | 'excerpt' | 'content_md' | 'featured_image' | 'status' | 'published_at' | 'created_at' | 'updated_at' | 'author_name'
>;

type GetAdminBlogPostsParams = {
  page: number; // 0-based
  pageSize: number;
};

export type CreateDraftBlogPostInput = {
  slug: BlogPostRecord['slug'];
  title: NonNullable<BlogPostRecord['title']>;
  excerpt: NonNullable<BlogPostRecord['excerpt']>;
  content_md: NonNullable<BlogPostRecord['content_md']>; // HTML dari Tiptap
  author_name: NonNullable<BlogPostRecord['author_name']>;
  reading_time_min: NonNullable<BlogPostRecord['reading_time_min']>;
  featured_image: BlogPostRecord['featured_image'];
  cover_alt: BlogPostRecord['cover_alt'];
  seo_title: BlogPostRecord['seo_title'];
  seo_description: BlogPostRecord['seo_description'];
  og_image: BlogPostRecord['og_image'];
};

export type DefaultInputBlogPost = {
  slug: BlogPostRecord['slug'];
  title: NonNullable<BlogPostRecord['title']>;
  excerpt: NonNullable<BlogPostRecord['excerpt']>;
  content_md: NonNullable<BlogPostRecord['content_md']>;
  author_name: NonNullable<BlogPostRecord['author_name']>;
  reading_time_min: NonNullable<BlogPostRecord['reading_time_min']>;
  featured_image: BlogPostRecord['featured_image'];
};

export type EditableBlogPost = Pick<
  BlogPostRecord,
  'id' | 'slug' | 'title' | 'excerpt' | 'content_md' | 'author_name' | 'reading_time_min' | 'featured_image' | 'cover_alt' | 'seo_title' | 'seo_description' | 'og_image'
>;

export type BlogPostRow = Pick<BlogPostRecord, 'id' | 'slug' | 'status' | 'created_at' | 'updated_at'>;

export async function getAdminBlogPostBySlug(slug: string): Promise<AdminBlogPostPreview | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      content_md,
      featured_image,
      status,
      published_at,
      created_at,
      updated_at,
      author_name
      `
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// admin read all
export async function getAdminBlogPosts({ page, pageSize }: GetAdminBlogPostsParams): Promise<{ data: BlogPost[]; count: number }> {
  const supabase = await createSupabaseServerClient();

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('blog_posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      status,
      created_at,
      updated_at
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data ?? [],
    count: count ?? 0,
  };
}

/** BLOG list (untuk /blog) */
export async function getPublishedBlogPosts(limit = 50): Promise<BlogPostSummary[]> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.blog);

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      slug,
      title,
      excerpt,
      featured_image,
      published_at
      `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getBlogPostForEdit(slug: string): Promise<EditableBlogPost> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
    id,
    slug,
    title,
    excerpt,
    content_md,
    author_name,
    reading_time_min,
    featured_image,
    cover_alt,
    seo_title,
    seo_description,
    og_image
  `
    )
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

/** BLOG detail (untuk /blog/[slug]) */
export async function getPublishedBlogPostBySlug(slug: string): Promise<PublishedBlogPost | null> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.blog);

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, content_md, author_name, featured_image, published_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data;
}

async function ensureUniqueSlug(baseSlug: string) {
  const supabase = await createSupabaseServerClient();

  // cek apakah slug sudah ada
  const { data, error } = await supabase.from('blog_posts').select('slug').eq('slug', baseSlug).maybeSingle();

  if (error) throw error;
  if (!data) return baseSlug;

  // kalau bentrok, cari suffix -2, -3, ...
  for (let i = 2; i <= 50; i++) {
    const candidate = `${baseSlug}-${i}`;
    const { data: d2, error: e2 } = await supabase.from('blog_posts').select('slug').eq('slug', candidate).maybeSingle();

    if (e2) throw e2;
    if (!d2) return candidate;
  }

  // fallback ekstrem
  return `${baseSlug}-${Date.now()}`;
}

export type CreateBlogInput = DefaultInputBlogPost;
export type UpdateBlogInput = Omit<DefaultInputBlogPost, 'author_name' | 'slug'>;

// INSERT draft
export async function createDraftBlogPost(input: CreateDraftBlogPostInput): Promise<BlogPostRow> {
  const supabase = await createSupabaseServerClient();

  const uniqueSlug = await ensureUniqueSlug(input.slug);

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      slug: uniqueSlug,
      title: input.title,
      excerpt: input.excerpt,
      content_md: input.content_md,
      author_name: input.author_name,
      reading_time_min: input.reading_time_min,
      featured_image: input.featured_image,
      cover_alt: input.cover_alt,
      seo_title: input.seo_title,
      seo_description: input.seo_description,
      og_image: input.og_image,
      status: 'draft',
      published_at: null,
    })
    .select('id, slug, status, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateEditedBlogPost(
  id: string,
  input: UpdateBlogInput & {
    cover_alt: string | null;
    seo_title: string | null;
    seo_description: string | null;
    og_image: string | null;
  }
) {
  const supabase = await createSupabaseServerClient();
  const { ...rest } = input;
  const { error } = await supabase.from('blog_posts').update(rest).eq('id', id).select('id, slug, status, updated_at').single();

  if (error) throw error;
}
