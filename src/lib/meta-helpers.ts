// src/lib/meta-helpers.ts
import type { Metadata } from 'next';

type BlogMetaInput = {
  slug: string;
  title: string;
  description: string;
  image?: string;
  date?: string;
  updatedAt?: string;
};

const SITE_NAME = 'Diputra Signature Indonesia';
const DEFAULT_OG_IMAGE = `${process.env.NEXT_PUBLIC_SITE_URL}/og/og-default.png`;

export function buildBlogPostMetadata({ slug, title, description, image, date, updatedAt }: BlogMetaInput): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const ogImage = image ? (image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_SITE_URL}${image}`) : DEFAULT_OG_IMAGE;
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${slug}`;

  return {
    title: fullTitle,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: fullTitle,
      description,
      type: 'article',
      siteName: SITE_NAME,
      url: canonicalUrl,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(date && { publishedTime: date }),
      ...(updatedAt && { modifiedTime: updatedAt }),
    },

    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}
