import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/supabase/queries/dashboard';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const p = new URL(request.url).searchParams;
  const filters: Record<string, string> = {};
  for (const key of ['pic', 'client', 'status', 'internalService', 'dateFrom', 'dateTo']) filters[key] = p.get(key) ?? '';
  try {
    return NextResponse.json(await getDashboardData(filters, request.signal), { headers });
  } catch {
    return NextResponse.json({ message: 'Unable to load dashboard.' }, { status: 500, headers });
  }
}
