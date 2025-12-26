import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_ROLES = ['super_admin', 'admin', 'editor', 'contributor'] as const;

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginRoute = pathname === '/login';

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  // belum login + akses /admin -> ke /login
  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // sudah login + buka /login -> hanya redirect kalau whitelisted + aktif + role allowed
  if (isLoginRoute && user) {
    const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single();

    if (profile && profile.is_active && ADMIN_ROLES.includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    // kalau tidak whitelisted / tidak aktif / role tidak allowed -> tetap di /login
  }

  // akses /admin + sudah login -> cek whitelist
  if (isAdminRoute && user) {
    const { data: profile, error } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single();

    if (error || !profile) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'not_whitelisted');
      return NextResponse.redirect(url);
    }

    if (!profile.is_active) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'inactive');
      return NextResponse.redirect(url);
    }

    if (!ADMIN_ROLES.includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};

// nanti setelah email ada
// const email = user.email ?? '';
// if (!email.endsWith('@diputrasignature.com')) {
//   // reject
// }
