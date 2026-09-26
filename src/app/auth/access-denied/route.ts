import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const appOrigin = process.env.NEXT_PUBLIC_SITE_URL || request.url;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', appOrigin));
  }

  const { data: status, error } = await supabase.rpc('ensure_admin_access_request');
  await supabase.auth.signOut();

  if (error || !status) {
    return NextResponse.redirect(new URL('/login?error=access_request_failed', appOrigin));
  }

  return NextResponse.redirect(new URL(`/access-request?status=${status}`, appOrigin));
}
