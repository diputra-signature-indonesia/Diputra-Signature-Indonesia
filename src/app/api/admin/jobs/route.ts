import { getAdminJobPage } from '@/lib/supabase/queries/all-jobs';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { initialAllJobsFilters } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  const filters = { ...initialAllJobsFilters };
  for (const key of Object.keys(filters) as (keyof typeof filters)[]) if (params.has(key)) filters[key] = params.get(key)!;
  const page = Number(params.get('page') ?? '1');
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || filters.query.length > 160) return NextResponse.json({ message: 'Invalid search.' }, { status: 400, headers });
  try {
    return NextResponse.json(await getAdminJobPage(filters, page, {}, request.signal), { headers });
  } catch (error) {
    const forbidden = typeof error === 'object' && error && 'code' in error && error.code === '42501';
    return NextResponse.json({ message: forbidden ? 'Active staff access required.' : 'Unable to load Jobs. Please retry.' }, { status: forbidden ? 403 : 500, headers });
  }
}
