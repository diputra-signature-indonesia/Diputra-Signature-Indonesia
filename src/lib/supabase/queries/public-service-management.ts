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

// Staff may read the catalogue and manage Q&A, but cannot call the admin-only
// catalogue RPC. Keep this RLS-backed projection bounded to the requested pages.
export async function getStaffPublicServiceManagementData(
  options: { categoryId?: string; categoryPage?: number; itemPage?: number; query?: string } = {},
  signal?: AbortSignal
): Promise<AdminPublicServicePage> {
  const supabase = await createSupabaseServerClient();
  const categoryPage = options.categoryPage ?? 1;
  const itemPage = options.itemPage ?? 1;
  const categoryFields =
    'id,slug,title,type,short_description,description,hero_heading,hero_image,card_image,card_icon_key,seo_title,seo_description,og_image,sort_order,is_published,version,created_at,services_items(count)' as const;
  let request = supabase.from('services_categories').select(categoryFields, { count: 'exact' }).is('deleted_at', null).is('services_items.deleted_at', null);
  if (options.query?.trim()) {
    const literal = options.query
      .trim()
      .replace(/[\\%_]/g, '\\$&')
      .replace(/"/g, '\\"');
    request = request.or(`title.ilike."%${literal}%",slug.ilike."%${literal}%"`);
  }
  request = request
    .order('sort_order')
    .order('title')
    .order('id')
    .range((categoryPage - 1) * 10, categoryPage * 10 - 1);
  const categoriesResult = await (signal ? request.abortSignal(signal) : request);
  if (categoriesResult.error) throw categoriesResult.error;
  const categories: AdminPublicServiceCategory[] = (categoriesResult.data ?? []).map(({ services_items, ...category }) => ({ ...category, items: [], itemCount: services_items[0]?.count ?? 0 }));
  let selected = categories.find((category) => category.id === options.categoryId) ?? (options.categoryId ? null : (categories[0] ?? null));
  if (options.categoryId && !selected) {
    const selectedRequest = supabase.from('services_categories').select(categoryFields).eq('id', options.categoryId).is('deleted_at', null).is('services_items.deleted_at', null);
    const selectedResult = await (signal ? selectedRequest.abortSignal(signal) : selectedRequest).maybeSingle();
    if (selectedResult.error) throw selectedResult.error;
    if (selectedResult.data) {
      const { services_items, ...category } = selectedResult.data;
      selected = { ...category, items: [], itemCount: services_items[0]?.count ?? 0 };
    }
  }
  let itemTotal = 0;
  if (selected) {
    const itemsRequest = supabase
      .from('services_items')
      .select('id,category_id,slug,title,description,icon_key,cta_label,cta_type,seo_title,seo_description,og_image,sort_order,is_published,version,created_at,services_item_details(count)', {
        count: 'exact',
      })
      .eq('category_id', selected.id)
      .is('deleted_at', null)
      .is('services_item_details.deleted_at', null)
      .order('sort_order')
      .order('title')
      .order('id')
      .range((itemPage - 1) * 10, itemPage * 10 - 1);
    const itemsResult = await (signal ? itemsRequest.abortSignal(signal) : itemsRequest);
    if (itemsResult.error) throw itemsResult.error;
    itemTotal = itemsResult.count ?? 0;
    selected = { ...selected, items: (itemsResult.data ?? []).map(({ services_item_details, ...item }) => ({ ...item, details: [], detailCount: services_item_details[0]?.count ?? 0 })) };
  }
  return {
    categories,
    categoryTotal: categoriesResult.count ?? 0,
    categoryPage,
    selected,
    itemTotal,
    itemPage,
    details: [],
    detailTotal: 0,
    detailPage: 1,
    nextCategoryOrder: 0,
    nextItemOrder: 0,
    nextDetailOrder: 0,
    revision: String(Date.now()),
  };
}
