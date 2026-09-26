import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isUserRole } from '@/types/auth-role';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const appOrigin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', appOrigin));
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', appOrigin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', appOrigin));
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=access_check_failed', appOrigin));
  }

  if (profile?.is_active && isUserRole(profile.role)) {
    return NextResponse.redirect(new URL('/admin', appOrigin));
  }

  const { data: requestStatus, error: requestError } = await supabase.rpc('ensure_admin_access_request');
  await supabase.auth.signOut();

  if (requestError || !requestStatus) {
    return NextResponse.redirect(new URL('/login?error=access_request_failed', appOrigin));
  }

  return NextResponse.redirect(new URL(`/access-request?status=${requestStatus}`, appOrigin));
}
