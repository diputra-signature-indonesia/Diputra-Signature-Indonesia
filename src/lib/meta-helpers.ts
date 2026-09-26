// src/lib/meta-helpers.ts
import type { Metadata } from 'next';

type BlogMetaInput = {
  slug: string;
  title: string;
  description: string;
  image?: string;
  date?: string;
  updatedAt?: string;
  author?: string;
  category?: string;
  tags?: string[];
  imageAlt?: string;
};

const SITE_NAME = 'Diputra Signature Indonesia';
const DEFAULT_OG_IMAGE = `${process.env.NEXT_PUBLIC_SITE_URL}/og/og-default.png`;

export function buildBlogPostMetadata({ slug, title, description, image, date, updatedAt, author, category, tags = [], imageAlt }: BlogMetaInput): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const ogImage = image ? (image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_SITE_URL}${image}`) : DEFAULT_OG_IMAGE;
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${slug}`;

  return {
    title: { absolute: fullTitle },
    description,
    applicationName: SITE_NAME,
    authors: author ? [{ name: author }] : [{ name: SITE_NAME }],
    category,
    keywords: tags,

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
          alt: imageAlt || title,
        },
      ],
      ...(date && { publishedTime: date }),
      ...(updatedAt && { modifiedTime: updatedAt }),
      authors: [author || SITE_NAME],
      tags,
    },

    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  };
}
