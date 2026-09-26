import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BlogFilters, BlogManagementData, BlogRevision, ManagedBlogPost } from '@/types/admin-blog';
import type { Tables } from '@/types/database.generated';
import { cacheLife, cacheTag } from 'next/cache';

type BlogPostRecord = Tables<'blog_posts'>;

export type BlogPostSummary = Pick<BlogPostRecord, 'slug' | 'title' | 'excerpt' | 'featured_image' | 'published_at' | 'updated_at'>;
export type PublishedBlogPost = Pick<BlogPostRecord, 'slug' | 'title' | 'excerpt' | 'content_md' | 'author_name' | 'featured_image' | 'cover_alt' | 'published_at' | 'updated_at' | 'seo_title' | 'seo_description' | 'category' | 'tags' | 'reading_time_min'>;
export type AdminBlogPostPreview = Pick<
  BlogPostRecord,
  'title' | 'excerpt' | 'content_md' | 'featured_image' | 'status' | 'created_by' | 'archived_at'
>;

const ADMIN_COLUMNS = `
  id, slug, title, excerpt, content_md, author_name, reading_time_min,
  featured_image, cover_alt, seo_title, seo_description, category, tags,
  status, is_featured, rejection_reason, created_by, updated_by, published_by,
  created_at, updated_at, published_at, archived_at, version
`;

function mapManagedPost(row: BlogPostRecord): ManagedBlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? 'Untitled',
    excerpt: row.excerpt ?? '',
    contentHtml: row.content_md ?? '',
    authorName: row.author_name ?? 'Diputra Team',
    readingTimeMinutes: Number(row.reading_time_min ?? 1),
    featuredImage: row.featured_image,
    coverAlt: row.cover_alt,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    category: row.category,
    tags: row.tags,
    status: row.status ?? 'draft',
    isFeatured: row.is_featured,
    rejectionReason: row.rejection_reason,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    publishedBy: row.published_by,
    createdAt: row.created_at ?? row.updated_at ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    version: row.version,
  };
}

export async function getBlogManagementData(filters: BlogFilters): Promise<BlogManagementData> {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const pageSize = 10;
  const from = (filters.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('blog_posts')
    .select(ADMIN_COLUMNS, { count: 'exact' })
    .order(filters.view === 'ARCHIVED' ? 'archived_at' : 'updated_at', { ascending: false })
    .range(from, to);

  query = filters.view === 'ARCHIVED' ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  if (filters.status !== 'ALL') query = query.eq('status', filters.status);
  if (filters.category !== 'ALL') query = query.eq('category', filters.category);
  if (filters.featured !== 'ALL') query = query.eq('is_featured', filters.featured === 'FEATURED');
  if (filters.query) {
    const safe = filters.query.replace(/[,%()]/g, ' ').trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%,author_name.ilike.%${safe}%`);
  }

  const countStatus = (status: 'draft' | 'pending' | 'published' | 'rejected') =>
    supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', status).is('archived_at', null);

  const [listResult, categoriesResult, draftResult, pendingResult, publishedResult, rejectedResult] = await Promise.all([
    query,
    supabase.from('blog_posts').select('category').is('archived_at', null).order('category'),
    countStatus('draft'),
    countStatus('pending'),
    countStatus('published'),
    countStatus('rejected'),
  ]);

  if (listResult.error) throw new Error(`Unable to load blog posts: ${listResult.error.message}`);
  if (categoriesResult.error) throw new Error(`Unable to load blog categories: ${categoriesResult.error.message}`);

  return {
    actorId: actor.userId,
    actorRole: actor.role,
    posts: ((listResult.data ?? []) as BlogPostRecord[]).map(mapManagedPost),
    total: listResult.count ?? 0,
    pageSize,
    categories: Array.from(new Set((categoriesResult.data ?? []).map((row) => row.category))).filter(Boolean),
    summary: {
      draft: draftResult.count ?? 0,
      pending: pendingResult.count ?? 0,
      published: publishedResult.count ?? 0,
      rejected: rejectedResult.count ?? 0,
    },
  };
}

export async function getAdminBlogPostBySlug(slug: string): Promise<AdminBlogPostPreview | null> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, excerpt, content_md, featured_image, status, created_by, archived_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBlogPostForEdit(slug: string): Promise<ManagedBlogPost | null> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('blog_posts').select(ADMIN_COLUMNS).eq('slug', slug).is('archived_at', null).maybeSingle();
  if (error) throw error;
  return data ? mapManagedPost(data as BlogPostRecord) : null;
}

export async function getBlogPostRevisions(postId: string): Promise<BlogRevision[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('blog_post_revisions')
    .select('id, source_version, snapshot, created_at')
    .eq('post_id', postId)
    .order('source_version', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((revision) => {
    const snapshot = revision.snapshot && typeof revision.snapshot === 'object' && !Array.isArray(revision.snapshot)
      ? revision.snapshot as Record<string, unknown>
      : {};
    return {
      id: revision.id,
      sourceVersion: revision.source_version,
      createdAt: revision.created_at,
      title: typeof snapshot.title === 'string' ? snapshot.title : 'Untitled article',
      status: typeof snapshot.status === 'string' ? snapshot.status : 'draft',
    };
  });
}

/** Public blog list. Featured posts are intentionally shown first. */
export async function getPublishedBlogPosts(limit = 50): Promise<BlogPostSummary[]> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.blog);

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, featured_image, published_at, updated_at')
    .eq('status', 'published')
    .is('archived_at', null)
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** Public blog detail. */
export async function getPublishedBlogPostBySlug(slug: string): Promise<PublishedBlogPost | null> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.blog);

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, content_md, author_name, featured_image, cover_alt, published_at, updated_at, seo_title, seo_description, category, tags, reading_time_min')
    .eq('slug', slug)
    .eq('status', 'published')
    .is('archived_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}
