// src/lib/meta-helpers.ts
import type { Metadata } from 'next';

// sesuaikan dengan bentuk minimal object "post" yang kamu punya sekarang
interface SimplePostForMeta {
  slug: string;
  title: string;
  excerpt?: string | null;
  description?: string | null;
  date: string; // ISO string
  updatedAt?: string | null;
}

const DEFAULT_BLOG_DESCRIPTION = 'Latest legal, immigration, and business insights from Bali.';

export function buildBlogPostMetadata(post: SimplePostForMeta): Metadata {
  const description = post.excerpt ?? post.description ?? DEFAULT_BLOG_DESCRIPTION;

  return {
    title: `${post.title} | Diputra Signature Indonesia`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updatedAt ?? post.date,
    },
  };
}
