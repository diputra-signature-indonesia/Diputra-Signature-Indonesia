import 'server-only';
import { normalizeInternalServiceSearch, INTERNAL_SERVICE_PAGE_SIZE, type InternalServiceSearchInput, type InternalServiceSearchPage } from '@/data/admin-master-data/internal-service-search';
import type { MasterDataRow } from '@/data/admin-master-data/master-data';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type SearchRecord = {
  id: string;
  code: string;
  name: string;
  summary: string | null;
  category_id: string | null;
  category_name: string | null;
  category_code?: string | null;
  workflow_template_id: string | null;
  workflow_name: string | null;
  step_count: number;
  reference_count: number;
  is_active: boolean;
  version: number;
  deletion_started_at?: string | null;
  sop_file_count?: number;
};

export async function getInternalServiceSearchPage(input: InternalServiceSearchInput, signal?: AbortSignal): Promise<InternalServiceSearchPage> {
  const { search, categoryId, page } = normalizeInternalServiceSearch(input);
  const supabase = await createSupabaseServerClient();
  const query = supabase.rpc('search_internal_services', {
    p_search: search,
    p_category_id: categoryId && categoryId !== 'uncategorized' ? categoryId : null,
    p_uncategorized: categoryId === 'uncategorized',
    p_page: page,
  } as never);
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw Object.assign(new Error('Unable to load Internal Services.'), { code: error.code });
  const result = data as unknown as { rows: SearchRecord[]; total: number; page: number; page_count: number };
  const rows: MasterDataRow[] = result.rows.map((service) => ({
    id: service.id,
    code: service.code,
    version: service.version,
    isActive: service.is_active,
    workflowTemplateId: service.workflow_template_id,
    internalCategoryId: service.category_id,
    internalCategoryCode: service.category_code ?? null,
    referenceCount: service.reference_count,
    deletionStartedAt: service.deletion_started_at,
    sopFileCount: service.sop_file_count,
    cells: [
      { type: 'text', value: service.name, secondary: service.summary ?? undefined },
      { type: 'text', value: service.code, mono: true },
      { type: 'text', value: service.category_name ?? 'Uncategorized' },
      {
        type: 'text',
        value: service.workflow_name ?? 'Not assigned',
        secondary: service.workflow_name ? service.step_count + ' ordered ' + (service.step_count === 1 ? 'step' : 'steps') : 'Required before use',
      },
      {
        type: 'badge',
        value: service.deletion_started_at ? 'Deletion pending' : service.is_active ? 'Active' : 'Inactive',
        tone: service.deletion_started_at ? 'red' : service.is_active ? 'green' : 'gray',
      },
    ],
  }));
  const offset = (result.page - 1) * INTERNAL_SERVICE_PAGE_SIZE;
  return { rows, total: result.total, page: result.page, pageCount: result.page_count, first: result.total ? offset + 1 : 0, last: Math.min(offset + INTERNAL_SERVICE_PAGE_SIZE, result.total) };
}
