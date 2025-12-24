import { supabase } from '@/lib/supabase/client';
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
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase.from('services_categories').select('*').eq('is_published', true).order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceCategory[];
}

/** SINGLE category by slug */
export async function getServiceCategoryBySlug(slug: string): Promise<ServiceCategory> {
  const { data, error } = await supabase.from('services_categories').select('*').eq('slug', slug).eq('is_published', true).single();

  if (error) throw error;
  return data as ServiceCategory;
}

/** LIST items by category slug (join) */
export async function getServiceItemsByCategorySlug(categorySlug: string): Promise<ServiceItem[]> {
  // 2-step: ambil category id dulu, lalu items
  const category = await getServiceCategoryBySlug(categorySlug);

  const { data, error } = await supabase.from('services_items').select('*').eq('category_id', category.id).eq('is_published', true).order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceItem[];
}

/** SINGLE item by (category slug + item slug) */
export async function getServiceItemByCategoryAndSlug(categorySlug: string, itemSlug: string): Promise<ServiceItem> {
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

/** LIST details by item id */
export async function getServiceItemDetailsByItemId(itemId: string): Promise<ServiceItemDetail[]> {
  const { data, error } = await supabase.from('services_item_details').select('*').eq('service_item_id', itemId).eq('is_published', true).order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceItemDetail[];
}

/** Convenience: detail page data */
export async function getServiceDetailPageData(categorySlug: string, itemSlug: string) {
  const category = await getServiceCategoryBySlug(categorySlug);
  const item = await getServiceItemByCategoryAndSlug(categorySlug, itemSlug);
  const details = await getServiceItemDetailsByItemId(item.id);

  return { category, item, details };
}
