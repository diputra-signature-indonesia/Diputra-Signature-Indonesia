import type { MasterDataRow } from './master-data';

export const INTERNAL_SERVICE_PAGE_SIZE = 10;
export const INTERNAL_SERVICE_SEARCH_DELAY = 400;

export type InternalServiceSearchInput = { search: string; categoryId: string; page: number };
export type InternalServiceSearchPage = {
  rows: MasterDataRow[];
  total: number;
  page: number;
  pageCount: number;
  first: number;
  last: number;
};

export function normalizeInternalServiceSearch(input: InternalServiceSearchInput): InternalServiceSearchInput {
  const search = input.search.trim().replace(/\s+/g, ' ');
  if (search.length > 160 || !Number.isSafeInteger(input.page) || input.page < 1 || input.page > 2147483647) throw new Error('Invalid service search.');
  if (input.categoryId && input.categoryId !== 'uncategorized' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.categoryId))
    throw new Error('Invalid service category.');
  return { search, categoryId: input.categoryId, page: input.page };
}

export function internalServiceSearchUrl(input: InternalServiceSearchInput) {
  const normalized = normalizeInternalServiceSearch(input);
  return '/api/admin/master-data/internal-services?' + new URLSearchParams({ search: normalized.search, category: normalized.categoryId, page: String(normalized.page) }).toString();
}
