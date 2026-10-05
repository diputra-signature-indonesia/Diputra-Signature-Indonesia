import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getMasterDataPage } from '@/lib/supabase/queries/master-data';
import { masterDataCategoryDefinitions } from '@/data/admin-master-data/master-data';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const p = new URL(request.url).searchParams;
  const category = masterDataCategoryDefinitions.find((c) => c.id === p.get('kind') && c.id !== 'internal-services');
  const query = p.get('query') ?? '';
  const page = Number(p.get('page') ?? 1);
  if (!category || query.length > 160 || !Number.isSafeInteger(page) || page < 1 || page > 1000000) return NextResponse.json({ message: 'Invalid search.' }, { status: 400, headers });
  try {
    return NextResponse.json(await getMasterDataPage(category.id, query, page, p.get('trash') === 'true', request.signal), { headers });
  } catch {
    return NextResponse.json({ message: 'Unable to load Master Data.' }, { status: 500, headers });
  }
}
