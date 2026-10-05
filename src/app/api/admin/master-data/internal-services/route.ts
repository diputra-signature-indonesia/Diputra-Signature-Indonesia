import { normalizeInternalServiceSearch } from '@/data/admin-master-data/internal-service-search';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getInternalServiceSearchPage } from '@/lib/supabase/queries/internal-service-search';
import { NextResponse } from 'next/server';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  let input;
  try {
    input = normalizeInternalServiceSearch({ search: params.get('search') ?? '', categoryId: params.get('category') ?? '', page: Number(params.get('page') ?? '1') });
  } catch {
    return NextResponse.json({ message: 'Invalid service search parameters.' }, { status: 400, headers });
  }
  try {
    return NextResponse.json(await getInternalServiceSearchPage(input, request.signal), { headers });
  } catch (error) {
    const forbidden = error instanceof Error && 'code' in error && error.code === '42501';
    return NextResponse.json({ message: forbidden ? 'Active staff access is required.' : 'Unable to load services. Please retry.' }, { status: forbidden ? 403 : 500, headers });
  }
}
