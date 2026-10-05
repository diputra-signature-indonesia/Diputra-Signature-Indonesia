import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const { data, error } = await supabase.rpc('get_own_account_details');
  if (error) {
    return NextResponse.json(
      { message: error.code === '42501' ? 'Your account is no longer active.' : 'Unable to load your account. Please try again.' },
      { status: error.code === '42501' ? 403 : 500, headers }
    );
  }
  return NextResponse.json(data, { headers });
}
