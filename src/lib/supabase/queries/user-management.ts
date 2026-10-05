import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type ManagedTeamMember = Pick<Tables<'team_members'>, 'id' | 'profile_id' | 'full_name' | 'short_bio' | 'avatar_url' | 'is_visible' | 'job_title_id'> & {
  jobTitleName: string | null;
};
export type ManagedProfile = Pick<Tables<'profiles'>, 'id' | 'email' | 'display_name' | 'avatar_url' | 'role' | 'is_active' | 'created_at' | 'updated_at'> & {
  teamMember: ManagedTeamMember | null;
};
export type PendingAccessRequest = Pick<Tables<'admin_access_requests'>, 'user_id' | 'email' | 'full_name' | 'avatar_url' | 'requested_at'>;
export type TeamJobTitleOption = Pick<Tables<'job_titles'>, 'id' | 'name' | 'sort_order' | 'is_active'>;

export type UserManagementData = {
  profiles: ManagedProfile[];
  total: number;
  page: number;
  revision: string;
  initialRequests: PendingAccessRequest[];
  pendingRequestCount: number;
  jobTitles: TeamJobTitleOption[];
};

export async function getUserManagementData(options: { includeAccessRequests: boolean }): Promise<UserManagementData> {
  const supabase = await createSupabaseServerClient();
  const profilesPage = await getManagedProfilePage();

  const [requestsResult, requestCountResult] = options.includeAccessRequests
    ? await Promise.all([
        supabase.rpc('list_pending_admin_access_requests', { p_limit: 10 }),
        supabase.from('admin_access_requests').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
    : [
        { data: [], error: null },
        { count: 0, error: null },
      ];

  if (requestsResult.error) throw new Error(`Unable to load access requests: ${requestsResult.error.message}`);
  if (requestCountResult.error) throw new Error(`Unable to count access requests: ${requestCountResult.error.message}`);

  return {
    ...profilesPage,
    revision: String(Date.now()),
    initialRequests: requestsResult.data ?? [],
    pendingRequestCount: requestCountResult.count ?? 0,
    jobTitles: [],
  };
}

export async function getManagedProfilePage(query = '', page = 1, signal?: AbortSignal): Promise<{ profiles: ManagedProfile[]; total: number; page: number }> {
  const supabase = await createSupabaseServerClient();
  const request = supabase.rpc('search_managed_profiles', { p_query: query, p_page: page });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return data as unknown as { profiles: ManagedProfile[]; total: number; page: number };
}
