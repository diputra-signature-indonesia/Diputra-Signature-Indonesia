import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSopWorkspaceData } from '@/lib/supabase/queries/sop';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const p = new URL(request.url).searchParams;
  const query = p.get('query') ?? '';
  const page = Number(p.get('page') ?? '1');
  const id = p.get('service');
  if (query.length > 160 || !Number.isSafeInteger(page) || page < 1 || page > 1000000 || (id && !/^[0-9a-f-]{36}$/i.test(id)))
    return NextResponse.json({ message: 'Invalid search.' }, { status: 400, headers });
  try {
    if (p.get('kind') === 'list') {
      const { data, error } = await supabase.rpc('search_sop_services', { p_query: query, p_page: page }).abortSignal(request.signal);
      if (error) throw error;
      return NextResponse.json(data, { headers });
    }
    return NextResponse.json(await getSopWorkspaceData(id ?? undefined), { headers });
  } catch {
    return NextResponse.json({ message: 'Unable to load SOP.' }, { status: 500, headers });
  }
}
