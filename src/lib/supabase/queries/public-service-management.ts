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
> & { details: AdminPublicServiceDetail[]; detailCount?: number };

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
> & { items: AdminPublicServiceItem[]; itemCount?: number };

export type AdminPublicServicePage = {
  categories: AdminPublicServiceCategory[];
  categoryTotal: number;
  categoryPage: number;
  selected: AdminPublicServiceCategory | null;
  itemTotal: number;
  itemPage: number;
  details: AdminPublicServiceDetail[];
  detailTotal: number;
  detailPage: number;
  nextCategoryOrder: number;
  nextItemOrder: number;
  nextDetailOrder: number;
  revision: string;
};

export async function getPublicServiceManagementData(
  options: {
    categoryId?: string;
    itemId?: string;
    categoryPage?: number;
    itemPage?: number;
    detailPage?: number;
    query?: string;
  } = {},
  signal?: AbortSignal
): Promise<AdminPublicServicePage> {
  const supabase = await createSupabaseServerClient();
  let request = supabase.rpc('admin_public_service_page', {
    p_category: options.categoryId,
    p_item: options.itemId,
    p_category_page: options.categoryPage ?? 1,
    p_item_page: options.itemPage ?? 1,
    p_detail_page: options.detailPage ?? 1,
    p_query: options.query ?? '',
  });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw new Error('Unable to load Client Services.');
  return { ...(data as unknown as AdminPublicServicePage), revision: String(Date.now()) };
}
