import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database.generated';
import { isUserRole } from '@/types/auth-role';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  function redirectWithRefreshedCookies(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginRoute = pathname === '/login';

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute && !user) {
    return redirectWithRefreshedCookies('/login');
  }

  if (!user) {
    return response;
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();

  if (profileError) {
    return isLoginRoute ? response : redirectWithRefreshedCookies('/login?error=access_check_failed');
  }

  if (profile?.is_active && isUserRole(profile.role)) {
    return isLoginRoute ? redirectWithRefreshedCookies('/admin') : response;
  }

  if (isAdminRoute || isLoginRoute) {
    return redirectWithRefreshedCookies('/auth/access-denied');
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
