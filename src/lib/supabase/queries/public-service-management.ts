import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type AdminPublicServiceDetail = Pick<
  Tables<'services_item_details'>,
  'id' | 'service_item_id' | 'title' | 'description' | 'cta_description' | 'sort_order' | 'is_published' | 'version' | 'created_at'
>;

export type AdminPublicServiceItem = Pick<
  Tables<'services_items'>,
  | 'id'
  | 'category_id'
  | 'slug'
  | 'title'
  | 'description'
  | 'icon_key'
  | 'cta_label'
  | 'cta_type'
  | 'seo_title'
  | 'seo_description'
  | 'og_image'
  | 'sort_order'
  | 'is_published'
  | 'version'
  | 'created_at'
> & { details: AdminPublicServiceDetail[] };

export type AdminPublicServiceCategory = Pick<
  Tables<'services_categories'>,
  | 'id'
  | 'slug'
  | 'title'
  | 'type'
  | 'short_description'
  | 'description'
  | 'hero_heading'
  | 'hero_image'
  | 'card_image'
  | 'card_icon_key'
  | 'seo_title'
  | 'seo_description'
  | 'og_image'
  | 'sort_order'
  | 'is_published'
  | 'version'
  | 'created_at'
> & { items: AdminPublicServiceItem[] };

function fail(label: string, error: { message: string } | null) {
  if (error) throw new Error(`Unable to load ${label}: ${error.message}`);
}

export async function getPublicServiceManagementData(): Promise<AdminPublicServiceCategory[]> {
  const supabase = await createSupabaseServerClient();
  const [categoriesResult, itemsResult, detailsResult] = await Promise.all([
    supabase
      .from('services_categories')
      .select('id,slug,title,type,short_description,description,hero_heading,hero_image,card_image,card_icon_key,seo_title,seo_description,og_image,sort_order,is_published,version,created_at')
      .is('deleted_at', null)
      .order('sort_order')
      .order('title'),
    supabase
      .from('services_items')
      .select('id,category_id,slug,title,description,icon_key,cta_label,cta_type,seo_title,seo_description,og_image,sort_order,is_published,version,created_at')
      .is('deleted_at', null)
      .order('sort_order')
      .order('title'),
    supabase
      .from('services_item_details')
      .select('id,service_item_id,title,description,cta_description,sort_order,is_published,version,created_at')
      .is('deleted_at', null)
      .order('sort_order')
      .order('title'),
  ]);

  fail('public Services', categoriesResult.error);
  fail('public Sub-services', itemsResult.error);
  fail('public Service details', detailsResult.error);

  const detailsByItem = new Map<string, AdminPublicServiceDetail[]>();
  for (const detail of detailsResult.data ?? []) {
    const details = detailsByItem.get(detail.service_item_id) ?? [];
    details.push(detail);
    detailsByItem.set(detail.service_item_id, details);
  }

  const itemsByCategory = new Map<string, AdminPublicServiceItem[]>();
  for (const item of itemsResult.data ?? []) {
    const items = itemsByCategory.get(item.category_id) ?? [];
    items.push({ ...item, details: detailsByItem.get(item.id) ?? [] });
    itemsByCategory.set(item.category_id, items);
  }

  return (categoriesResult.data ?? []).map((category) => ({ ...category, items: itemsByCategory.get(category.id) ?? [] }));
}
