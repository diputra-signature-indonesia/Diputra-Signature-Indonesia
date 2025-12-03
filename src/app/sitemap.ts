import { getAllPosts } from '@/lib/getAllPosts'; // sesuaikan dengan function milik Anda
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://diputrasingapore.com'; // ganti ke domain final Anda

  // --- BLOG POSTS ---
  let posts: { slug: string; updatedAt?: string }[] = [];

  try {
    posts = await getAllPosts(); // Aman meski masih kosong
  } catch (error) {
    posts = []; // fallback agar sitemap tidak error
  }

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // --- STATIC ROUTES ---
  const staticRoutes: MetadataRoute.Sitemap = ['', '/about', '/contact', '/services', '/blog'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...blogRoutes];
}
