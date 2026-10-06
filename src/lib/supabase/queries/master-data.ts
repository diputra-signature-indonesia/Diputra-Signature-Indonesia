import 'server-only';
import { masterDataCategoryDefinitions, type MasterDataCategory, type MasterDataCategoryId, type MasterDataCell, type MasterDataRow } from '@/data/admin-master-data/master-data';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RecordRow = {
  id: string;
  code: string;
  name: string;
  version: number;
  is_active?: boolean;
  is_system?: boolean;
  color?: string;
  sort_order?: number;
  description?: string;
  stepNames?: string[];
  referenceCount?: number;
};
export type MasterPage = { rows: MasterDataRow[]; total: number; page: number };
const text = (value: string, extra: Partial<Extract<MasterDataCell, { type: 'text' }>> = {}): MasterDataCell => ({ type: 'text', value, ...extra });
const active = (value: boolean): MasterDataCell => ({ type: 'badge', value: value ? 'Active' : 'Inactive', tone: value ? 'green' : 'gray' });
export function mapMasterRow(kind: MasterDataCategoryId, r: RecordRow): MasterDataRow {
  const isActive = r.is_active ?? true;
  let cells: MasterDataCell[];
  if (kind === 'internal-service-categories') cells = [text(r.name), text(r.code, { mono: true }), text(String(r.referenceCount ?? 0)), active(isActive)];
  else if (kind === 'workflow-templates')
    cells = [text(r.name, { secondary: r.description }), { type: 'steps', items: r.stepNames ?? [] }, text(`${r.referenceCount ?? 0} references`), active(isActive)];
  else if (kind === 'job-titles') cells = [text(r.name), text(r.code, { mono: true }), text(String(r.sort_order ?? 0)), active(isActive)];
  else {
    cells = [text(r.name), text(r.code, { mono: true }), { type: 'color', value: r.color ?? '#8C1010', color: r.color ?? '#8C1010' }, text(String(r.sort_order ?? 0)), active(isActive)];
    if (kind !== 'priorities') cells.push({ type: 'badge', value: r.is_system ? 'System' : 'Custom', tone: r.is_system ? 'gray' : 'purple' });
  }
  return { id: r.id, code: r.code, version: r.version, isActive, isSystem: r.is_system, referenceCount: r.referenceCount, cells };
}
export async function getMasterDataCategories(): Promise<MasterDataCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_master_counts');
  if (error) throw new Error('Unable to load Master Data counts.');
  const counts = data as Record<string, number> | null;
  if (!counts || masterDataCategoryDefinitions.some((category) => !Number.isSafeInteger(counts[category.id]) || counts[category.id] < 0)) throw new Error('No count returned for Master Data.');
  return masterDataCategoryDefinitions.map((category) => ({ ...category, rows: [], totalCount: counts[category.id] ?? 0 }));
}
export async function getMasterDataPage(kind: MasterDataCategoryId, query = '', page = 1, trash = false, signal?: AbortSignal): Promise<MasterPage> {
  const supabase = await createSupabaseServerClient();
  let request = supabase.rpc('admin_master_page', { p_kind: kind, p_query: query, p_page: page, p_trash: trash });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw new Error('Unable to load Master Data.');
  const result = data as unknown as { rows: RecordRow[]; total: number; page: number };
  return { ...result, rows: result.rows.map((row) => mapMasterRow(kind, row)) };
}
