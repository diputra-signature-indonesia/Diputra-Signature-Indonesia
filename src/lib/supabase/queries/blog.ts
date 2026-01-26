import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Status } from '@/types/blog-status';

export type BlogPost = {
  id: string; // kalau tabelmu pakai uuid id
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  author_name: string | null;
  reading_time_min: number | null;
  featured_image: string | null; // cover src
  cover_alt: string | null;
  published_at: string | null; // date/timestamptz
  status: Status;
  created_at?: string | null;
  updated_at?: string | null;
};

type GetAdminBlogPostsParams = {
  page: number; // 0-based
  pageSize: number;
};

export type CreateDraftBlogPostInput = {
  slug: string;
  title: string;
  excerpt: string;
  content_md: string; // HTML dari Tiptap
  author_name: string;
  reading_time_min: number;
  featured_image: string | null;
  cover_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
};

export type DefaultInputBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  author_name: string;
  reading_time_min: number;
  featured_image: string | null;
};

export type EditableBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  author_name: string;
  reading_time_min: number;
  featured_image: string | null;
  cover_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  status: Status;
  created_at: string | null;
  updated_at: string | null;
};

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
    data: (data ?? []) as BlogPost[],
    count: count ?? 0,
  };
}

/** BLOG list (untuk /blog) */
export async function getPublishedBlogPosts(limit = 50): Promise<BlogPost[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      `
      slug,
      title,
      excerpt,
      author_name,
      reading_time_min,
      featured_image,
      cover_alt,
      published_at,
      status
      `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as BlogPost[];
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
  return data as EditableBlogPost;
}

/** BLOG detail (untuk /blog/[slug]) */
export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single();

  if (error) throw error;
  return data as BlogPost;
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
  return data as BlogPostRow;
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
