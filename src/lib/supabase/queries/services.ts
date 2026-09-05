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

export type ServiceCategorySummary = Pick<ServiceCategory, 'id' | 'slug' | 'title' | 'type' | 'short_description' | 'card_image' | 'card_icon_key'>;

export type ServiceCategoryPageCategory = Pick<ServiceCategory, 'seo_title' | 'seo_description' | 'title' | 'short_description' | 'description' | 'hero_heading' | 'hero_image'>;

export type ServiceCategoryPageItem = Pick<ServiceItem, 'slug' | 'title' | 'description' | 'icon_key' | 'cta_label' | 'cta_type'>;

export type ServiceDetailPageCategory = Pick<ServiceCategory, 'seo_title'>;

export type ServiceDetailPageItem = Pick<ServiceItem, 'seo_title' | 'seo_description' | 'title' | 'description'>;

export type ServiceDetailPageContent = Pick<ServiceItemDetail, 'title' | 'description' | 'cta_description'>;

export type ServiceCategoryPageData = {
  category: ServiceCategoryPageCategory;
  items: ServiceCategoryPageItem[];
};

export type ServiceDetailPageData = {
  category: ServiceDetailPageCategory;
  item: ServiceDetailPageItem;
  details: ServiceDetailPageContent[];
};

type ServiceCategoryPageRow = ServiceCategoryPageCategory & {
  services_items: ServiceCategoryPageItem[];
};

type ServiceDetailPageRow = ServiceDetailPageItem & {
  services_categories: ServiceDetailPageCategory;
  services_item_details: ServiceDetailPageContent[];
};

/** LIST categories (untuk section Services / services page) */
async function fetchServiceCategories(): Promise<ServiceCategorySummary[]> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('services_categories')
    .select('id, slug, title, type, short_description, card_image, card_icon_key')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceCategorySummary[];
}

export const getServiceCategories = unstable_cache(fetchServiceCategories, getPublicCacheKeyParts('service-categories'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

/** SINGLE category with its published items */
async function fetchServiceCategoryPageData(categorySlug: string): Promise<ServiceCategoryPageData | null> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('services_categories')
    .select(
      `
      seo_title,
      seo_description,
      title,
      short_description,
      description,
      hero_heading,
      hero_image,
      services_items (
        slug,
        title,
        description,
        icon_key,
        cta_label,
        cta_type
      )
      `
    )
    .eq('slug', categorySlug)
    .eq('is_published', true)
    .eq('services_items.is_published', true)
    .order('sort_order', { referencedTable: 'services_items', ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const { services_items: items, ...category } = data as ServiceCategoryPageRow;
  return { category, items: items ?? [] };
}

const getServiceCategoryPageDataCached = unstable_cache(fetchServiceCategoryPageData, getPublicCacheKeyParts('service-category-page-data'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

export const getServiceCategoryPageData = cache(getServiceCategoryPageDataCached);

/** Convenience: detail page data */
async function fetchServiceDetailPageData(categorySlug: string, itemSlug: string): Promise<ServiceDetailPageData | null> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('services_items')
    .select(
      `
      seo_title,
      seo_description,
      title,
      description,
      services_categories!inner (
        seo_title
      ),
      services_item_details (
        title,
        description,
        cta_description
      )
      `
    )
    .eq('services_categories.slug', categorySlug)
    .eq('services_categories.is_published', true)
    .eq('slug', itemSlug)
    .eq('is_published', true)
    .eq('services_item_details.is_published', true)
    .order('sort_order', { referencedTable: 'services_item_details', ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { services_categories: category, services_item_details: details, ...item } = data as unknown as ServiceDetailPageRow;

  return { category, item, details: details ?? [] };
}

const getServiceDetailPageDataCached = unstable_cache(fetchServiceDetailPageData, getPublicCacheKeyParts('service-detail-page-data'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

export const getServiceDetailPageData = cache(getServiceDetailPageDataCached);
