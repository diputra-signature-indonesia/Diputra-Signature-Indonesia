import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import { cacheLife, cacheTag } from 'next/cache';
import type { Tables } from '@/types/database.generated';

export type ServiceCategory = Tables<'services_categories'>;
export type ServiceItem = Tables<'services_items'>;
export type ServiceItemDetail = Tables<'services_item_details'>;

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

/** LIST categories (untuk section Services / services page) */
export async function getServiceCategories(): Promise<ServiceCategorySummary[]> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.services);

  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase
    .from('services_categories')
    .select('id, slug, title, type, short_description, card_image, card_icon_key')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** SINGLE category with its published items */
export async function getServiceCategoryPageData(categorySlug: string): Promise<ServiceCategoryPageData | null> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.services);

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
  const { services_items: items, ...category } = data;
  return { category, items: items ?? [] };
}

/** Convenience: detail page data */
export async function getServiceDetailPageData(categorySlug: string, itemSlug: string): Promise<ServiceDetailPageData | null> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.services);

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

  const { services_categories: category, services_item_details: details, ...item } = data;

  return { category, item, details: details ?? [] };
}
