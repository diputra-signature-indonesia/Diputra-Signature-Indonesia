import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicServiceManagementData, getStaffPublicServiceManagementData } from '@/lib/supabase/queries/public-service-management';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const { data: profile } = await supabase.from('profiles').select('role,is_active,deleted_at').eq('id', user.id).maybeSingle();
  if (!profile?.is_active || profile.deleted_at) return NextResponse.json({ message: 'Admin access required.' }, { status: 403, headers });
  const p = new URL(request.url).searchParams;
  const page = (key: string) => Number(p.get(key) ?? 1);
  const id = (key: string) => p.get(key) || undefined;
  if (
    (p.get('query') ?? '').length > 160 ||
    ['categoryPage', 'itemPage', 'detailPage'].some((k) => !Number.isSafeInteger(page(k)) || page(k) < 1 || page(k) > 1000000) ||
    ['category', 'item'].some((k) => id(k) && !/^[0-9a-f-]{36}$/i.test(id(k)!))
  )
    return NextResponse.json({ message: 'Invalid search.' }, { status: 400, headers });
  try {
    return NextResponse.json(
      await (profile.role === 'staff' ? getStaffPublicServiceManagementData : getPublicServiceManagementData)(
        {
          categoryId: id('category'),
          itemId: id('item'),
          categoryPage: page('categoryPage'),
          itemPage: page('itemPage'),
          detailPage: page('detailPage'),
          query: p.get('query') ?? '',
        },
        request.signal
      ),
      { headers }
    );
  } catch {
    return NextResponse.json({ message: 'Unable to load Client Services.' }, { status: 500, headers });
  }
}
