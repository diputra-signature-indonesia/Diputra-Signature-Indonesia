import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: status, error } = await supabase.rpc('ensure_admin_access_request');
  await supabase.auth.signOut();

  if (error || !status) {
    return NextResponse.redirect(new URL('/login?error=access_request_failed', request.url));
  }

  return NextResponse.redirect(new URL(`/access-request?status=${status}`, request.url));
}
