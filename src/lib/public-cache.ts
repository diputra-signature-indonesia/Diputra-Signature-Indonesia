import 'server-only';

export const PUBLIC_CACHE_REVALIDATE_SECONDS = 15 * 60;

export const PUBLIC_CACHE_TAGS = {
  blog: 'public-blog',
  reviews: 'public-reviews',
  services: 'public-services',
  team: 'public-team',
} as const;

const publicCacheEnvironment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';
const publicDataSource = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'missing-supabase-url';

export function getPublicCacheKeyParts(dataSet: string): string[] {
  return ['dsi-public-v1', publicCacheEnvironment, publicDataSource, dataSet];
}
