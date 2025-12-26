import { createSupabaseServerClient } from '@/lib/supabase/server';

export type BlogPost = {
  id?: string; // kalau tabelmu pakai uuid id
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  author_name: string | null;
  reading_time_min: number | null;
  featured_image: string | null; // cover src
  cover_alt: string | null;
  published_at: string | null; // date/timestamptz
  is_published: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** BLOG list (untuk /blog) */
export async function getPublishedBlogPosts(limit = 50): Promise<BlogPost[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug,title,excerpt,author_name,reading_time_min,featured_image,cover_alt,published_at,is_published')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

/** BLOG detail (untuk /blog/[slug]) */
export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('is_published', true).single();

  if (error) throw error;
  return data as BlogPost;
}
