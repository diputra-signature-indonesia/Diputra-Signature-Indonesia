import 'server-only';

export const PUBLIC_CACHE_LIFE = {
  stale: 5 * 60,
  revalidate: 15 * 60,
  expire: 24 * 60 * 60,
} as const;

export const PUBLIC_CACHE_TAGS = {
  blog: 'public-blog',
  reviews: 'public-reviews',
  services: 'public-services',
  team: 'public-team',
} as const;
