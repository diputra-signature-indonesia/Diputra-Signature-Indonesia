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

export type ServiceCategoryPageData = {
  category: ServiceCategory;
  items: ServiceItem[];
};

export type ServiceDetailPageData = {
  category: ServiceCategory;
  item: ServiceItem;
  details: ServiceItemDetail[];
};

type ServiceCategoryPageRow = ServiceCategory & {
  services_items: ServiceItem[];
};

type ServiceDetailPageRow = ServiceItem & {
  services_categories: ServiceCategory;
  services_item_details: ServiceItemDetail[];
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

/** SINGLE category with its published items */
async function fetchServiceCategoryPageData(categorySlug: string): Promise<ServiceCategoryPageData> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('services_categories')
    .select(
      `
      id,
      slug,
      seo_title,
      seo_description,
      og_image,
      title,
      type,
      short_description,
      description,
      hero_heading,
      hero_image,
      card_image,
      card_icon_key,
      sort_order,
      is_published,
      services_items (
        id,
        category_id,
        slug,
        seo_title,
        seo_description,
        og_image,
        title,
        description,
        icon_key,
        cta_label,
        cta_type,
        sort_order,
        is_published
      )
      `
    )
    .eq('slug', categorySlug)
    .eq('is_published', true)
    .eq('services_items.is_published', true)
    .order('sort_order', { referencedTable: 'services_items', ascending: true })
    .single();

  if (error) throw error;
  const { services_items: items, ...category } = data as ServiceCategoryPageRow;
  return { category, items: items ?? [] };
}

const getServiceCategoryPageDataCached = unstable_cache(fetchServiceCategoryPageData, getPublicCacheKeyParts('service-category-page-data'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

export const getServiceCategoryPageData = cache(getServiceCategoryPageDataCached);

/** Convenience: detail page data */
async function fetchServiceDetailPageData(categorySlug: string, itemSlug: string): Promise<ServiceDetailPageData> {
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('services_items')
    .select(
      `
      id,
      category_id,
      slug,
      seo_title,
      seo_description,
      og_image,
      title,
      description,
      icon_key,
      cta_label,
      cta_type,
      sort_order,
      is_published,
      services_categories!inner (
        id,
        slug,
        seo_title,
        seo_description,
        og_image,
        title,
        type,
        short_description,
        description,
        hero_heading,
        hero_image,
        card_image,
        card_icon_key,
        sort_order,
        is_published
      ),
      services_item_details (
        id,
        service_item_id,
        title,
        description,
        cta_description,
        sort_order,
        is_published
      )
      `
    )
    .eq('services_categories.slug', categorySlug)
    .eq('services_categories.is_published', true)
    .eq('slug', itemSlug)
    .eq('is_published', true)
    .eq('services_item_details.is_published', true)
    .order('sort_order', { referencedTable: 'services_item_details', ascending: true })
    .single();

  if (error) throw error;

  const { services_categories: category, services_item_details: details, ...item } = data as unknown as ServiceDetailPageRow;

  return { category, item, details: details ?? [] };
}

const getServiceDetailPageDataCached = unstable_cache(fetchServiceDetailPageData, getPublicCacheKeyParts('service-detail-page-data'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.services],
});

export const getServiceDetailPageData = cache(getServiceDetailPageDataCached);
