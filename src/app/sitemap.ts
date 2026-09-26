// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { getPublishedBlogPosts } from '@/lib/supabase/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const now = new Date();

  // Static routes (typed as literal)
  const staticRoutes = [
    { route: '', priority: 1.0, changeFrequency: 'monthly' },
    { route: '/services', priority: 0.9, changeFrequency: 'monthly' },
    { route: '/about', priority: 0.7, changeFrequency: 'yearly' },
    { route: '/blog', priority: 0.6, changeFrequency: 'weekly' },
    { route: '/contact', priority: 0.6, changeFrequency: 'yearly' },
  ] as const;

  const staticSitemap: MetadataRoute.Sitemap = staticRoutes.map(({ route, priority, changeFrequency }) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const posts = await getPublishedBlogPosts(1000);
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : post.published_at ? new Date(post.published_at) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticSitemap, ...blogRoutes];
}
