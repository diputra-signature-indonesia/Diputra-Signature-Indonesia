import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind') ?? '';
  const query = params.get('query') ?? '';
  const id = params.get('id');
  const parent = params.get('parent');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    !['profiles', 'clients', 'services', 'service_filters', 'internal_categories', 'internal_category_filters', 'workflows', 'job_titles', 'jobs'].includes(kind) ||
    query.length > 160 ||
    (id && !uuid.test(id)) ||
    (parent && !uuid.test(parent))
  )
    return NextResponse.json({ message: 'Invalid lookup.' }, { status: 400, headers });
  const { data, error } = await supabase.rpc('search_admin_lookup', { p_kind: kind, p_query: query, p_id: id ?? undefined, p_parent: parent ?? undefined }).abortSignal(request.signal);
  if (error) return NextResponse.json({ message: error.code === '42501' ? 'Active staff access required.' : 'Unable to load choices.' }, { status: error.code === '42501' ? 403 : 500, headers });
  return NextResponse.json(data, { headers });
}
