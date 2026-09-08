import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isUserRole, type UserRole } from '@/types/auth-role';
import { redirect } from 'next/navigation';

export type ActiveAdminContext = {
  userId: string;
  role: UserRole;
};

export async function requireActiveAdmin(): Promise<ActiveAdminContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();

  if (profileError) {
    throw new Error(`Unable to verify admin access: ${profileError.message}`);
  }

  if (!profile?.is_active || !isUserRole(profile.role)) {
    redirect('/auth/access-denied');
  }

  return { userId: user.id, role: profile.role };
}

export async function requireActiveSuperAdmin(): Promise<ActiveAdminContext> {
  const context = await requireActiveAdmin();

  if (context.role !== 'super_admin') {
    redirect('/admin');
  }

  return context;
}
