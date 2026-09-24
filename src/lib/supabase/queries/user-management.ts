import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type ManagedProfile = Pick<Tables<'profiles'>, 'id' | 'email' | 'display_name' | 'avatar_url' | 'role' | 'is_active' | 'created_at' | 'updated_at'>;
export type PendingAccessRequest = Pick<Tables<'admin_access_requests'>, 'user_id' | 'email' | 'full_name' | 'avatar_url' | 'requested_at'>;

export type UserManagementData = {
  profiles: ManagedProfile[];
  initialRequests: PendingAccessRequest[];
  pendingRequestCount: number;
};

export async function getUserManagementData(): Promise<UserManagementData> {
  const supabase = await createSupabaseServerClient();
  const [profilesResult, requestsResult, requestCountResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,email,display_name,avatar_url,role,is_active,created_at,updated_at')
      .is('deleted_at', null)
      .order('display_name', { ascending: true, nullsFirst: false })
      .order('email', { ascending: true }),
    supabase.rpc('list_pending_admin_access_requests', { p_limit: 10 }),
    supabase.from('admin_access_requests').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  if (profilesResult.error) {
    throw new Error(`Unable to load user profiles: ${profilesResult.error.message}`);
  }

  if (requestsResult.error) {
    throw new Error(`Unable to load access requests: ${requestsResult.error.message}`);
  }

  if (requestCountResult.error) {
    throw new Error(`Unable to count access requests: ${requestCountResult.error.message}`);
  }

  return {
    profiles: profilesResult.data ?? [],
    initialRequests: requestsResult.data ?? [],
    pendingRequestCount: requestCountResult.count ?? 0,
  };
}
