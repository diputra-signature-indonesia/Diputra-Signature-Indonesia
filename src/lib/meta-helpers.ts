// src/lib/meta-helpers.ts
import type { Metadata } from 'next';

// sesuaikan dengan bentuk minimal object "post" yang kamu punya sekarang
type BlogMetaInput = {
  title: string;
  description: string;
  image?: string;
  date?: string;
};

const SITE_NAME = 'Diputra Signature Indonesia';
const SITE_URL = 'https://diputrasignature.com'; // ganti nanti
const DEFAULT_OG_IMAGE = '/image/og-default.jpg';

export function buildBlogPostMetadata({ title, description, image, date }: BlogMetaInput): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;

  return {
    title: fullTitle,
    description,

    openGraph: {
      title: fullTitle,
      description,
      type: 'article',
      siteName: SITE_NAME,
      url: SITE_URL,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      publishedTime: date,
    },

    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}
