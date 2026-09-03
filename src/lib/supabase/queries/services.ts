import { getPublicCacheKeyParts, PUBLIC_CACHE_REVALIDATE_SECONDS, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { ServiceIconKey } from '@/types/dsi-services';

export type ServiceCategory = {
  id: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  title: string | null;
  type: string | null;
  short_description: string | null;
  description: string | null;
  hero_heading: string | null;
  hero_image: string | null;
  card_image: string | null;
  card_icon_key: ServiceIconKey | null;
  sort_order: number | null;
  is_published: boolean | null;
};

export type ServiceItem = {
  id: string;
  category_id: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  title: string | null;
  description: string | null;
  icon_key: string | null;
  cta_label: string | null;
  cta_type: string | null;
  sort_order: number | null;
  is_published: boolean | null;
};

export type ServiceItemDetail = {
  id: string;
  service_item_id: string;
  title: string | null; // atau detail_title, sesuaikan
  description: string | null;
  cta_description: string | null;
  sort_order: number | null;
  is_published: boolean | null;
};

/** LIST categories (untuk section Services / services page) */
async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase.from('services_categories').select('*').eq('is_published', true).order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceCategory[];
}

export const getServiceCategories = unstable_cache(fetchServiceCategories, getPublicCacheKeyParts('service-categories'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

/** SINGLE category by slug */
async function fetchServiceCategoryBySlug(slug: string): Promise<ServiceCategory> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase.from('services_categories').select('*').eq('slug', slug).eq('is_published', true).single();

  if (error) throw error;
  return data as ServiceCategory;
}

const getServiceCategoryBySlugCached = unstable_cache(fetchServiceCategoryBySlug, getPublicCacheKeyParts('service-category-by-slug'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

export const getServiceCategoryBySlug = cache(getServiceCategoryBySlugCached);

/** LIST items by category slug (join) */
async function fetchServiceItemsByCategorySlug(categorySlug: string): Promise<ServiceItem[]> {
  const supabase = createSupabasePublicServerClient();
  // 2-step: ambil category id dulu, lalu items
  const category = await getServiceCategoryBySlug(categorySlug);

  const { data, error } = await supabase.from('services_items').select('*').eq('category_id', category.id).eq('is_published', true).order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceItem[];
}

export const getServiceItemsByCategorySlug = unstable_cache(fetchServiceItemsByCategorySlug, getPublicCacheKeyParts('service-items-by-category-slug'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

/** SINGLE item by (category slug + item slug) */
async function fetchServiceItemByCategoryAndSlug(categorySlug: string, itemSlug: string): Promise<ServiceItem> {
  const supabase = createSupabasePublicServerClient();
  // join supaya validasi item benar-benar milik category itu
  const { data, error } = await supabase
    .from('services_items')
    .select(
      `
      *,
      services_categories!inner(slug)
    `
    )
    .eq('services_categories.slug', categorySlug)
    .eq('slug', itemSlug)
    .eq('is_published', true)
    .single();

  if (error) throw error;
  return data as ServiceItem;
}

export const getServiceItemByCategoryAndSlug = unstable_cache(fetchServiceItemByCategoryAndSlug, getPublicCacheKeyParts('service-item-by-category-and-slug'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

/** LIST details by item id */
async function fetchServiceItemDetailsByItemId(itemId: string): Promise<ServiceItemDetail[]> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase.from('services_item_details').select('*').eq('service_item_id', itemId).eq('is_published', true).order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceItemDetail[];
}

export const getServiceItemDetailsByItemId = unstable_cache(fetchServiceItemDetailsByItemId, getPublicCacheKeyParts('service-item-details-by-item-id'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

/** Convenience: detail page data */
async function fetchServiceDetailPageData(categorySlug: string, itemSlug: string) {
  const category = await getServiceCategoryBySlug(categorySlug);
  const item = await getServiceItemByCategoryAndSlug(categorySlug, itemSlug);
  const details = await getServiceItemDetailsByItemId(item.id);

  return { category, item, details };
}

export const getServiceDetailPageData = cache(fetchServiceDetailPageData);
