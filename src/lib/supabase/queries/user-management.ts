import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type ManagedTeamMember = Pick<Tables<'team_members'>, 'id' | 'profile_id' | 'full_name' | 'short_bio' | 'avatar_url' | 'is_visible' | 'job_title_id'> & {
  jobTitleName: string | null;
};
export type ManagedProfile = Pick<Tables<'profiles'>, 'id' | 'email' | 'display_name' | 'avatar_url' | 'role' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  teamMember: ManagedTeamMember | null;
};
export type PendingAccessRequest = Pick<Tables<'admin_access_requests'>, 'user_id' | 'email' | 'full_name' | 'avatar_url' | 'requested_at'>;
export type RejectedAccessRequest = Pick<Tables<'admin_access_requests'>, 'user_id' | 'email' | 'full_name' | 'avatar_url' | 'requested_at' | 'reviewed_at' | 'rejection_reason'>;
export type TeamJobTitleOption = Pick<Tables<'job_titles'>, 'id' | 'name' | 'sort_order' | 'is_active'>;

export type UserManagementData = {
  profiles: ManagedProfile[];
  total: number;
  page: number;
  revision: string;
  trashedProfileCount: number;
  initialRequests: PendingAccessRequest[];
  pendingRequestCount: number;
  initialRejectedRequests: RejectedAccessRequest[];
  rejectedRequestCount: number;
  jobTitles: TeamJobTitleOption[];
};

export async function getUserManagementData(options: { includeAccessRequests: boolean }): Promise<UserManagementData> {
  const supabase = await createSupabaseServerClient();
  const profilesPage = await getManagedProfilePage();

  const [requestsResult, requestCountResult, rejectedRequestsResult, rejectedRequestCountResult, trashCountResult] = options.includeAccessRequests
    ? await Promise.all([
        supabase.rpc('list_pending_admin_access_requests', { p_limit: 10 }),
        supabase.from('admin_access_requests').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.rpc('list_rejected_admin_access_requests', { p_limit: 10 }),
        supabase.from('admin_access_requests').select('user_id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null),
      ])
    : [
        { data: [], error: null },
        { count: 0, error: null },
        { data: [], error: null },
        { count: 0, error: null },
      ];
  const trashCount = trashCountResult ?? { count: 0, error: null };

  if (requestsResult.error) throw new Error(`Unable to load access requests: ${requestsResult.error.message}`);
  if (requestCountResult.error) throw new Error(`Unable to count access requests: ${requestCountResult.error.message}`);
  if (rejectedRequestsResult.error) throw new Error(`Unable to load rejected access requests: ${rejectedRequestsResult.error.message}`);
  if (rejectedRequestCountResult.error) throw new Error(`Unable to count rejected access requests: ${rejectedRequestCountResult.error.message}`);
  if (trashCount.error) throw new Error(`Unable to count deleted users: ${trashCount.error.message}`);

  return {
    ...profilesPage,
    revision: String(Date.now()),
    initialRequests: requestsResult.data ?? [],
    pendingRequestCount: requestCountResult.count ?? 0,
    initialRejectedRequests: rejectedRequestsResult.data ?? [],
    rejectedRequestCount: rejectedRequestCountResult.count ?? 0,
    trashedProfileCount: trashCount.count ?? 0,
    jobTitles: [],
  };
}

export async function getTrashedProfilePage(page = 1, signal?: AbortSignal): Promise<{ profiles: ManagedProfile[]; total: number; page: number }> {
  const supabase = await createSupabaseServerClient();
  const request = supabase
    .from('profiles')
    .select('id,email,display_name,avatar_url,role,is_active,created_at,updated_at,deleted_at', { count: 'exact' })
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .order('id')
    .range((page - 1) * 10, page * 10 - 1);
  const { data, count, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return { profiles: (data ?? []).map((profile) => ({ ...profile, teamMember: null })), total: count ?? 0, page };
}

export async function getManagedProfilePage(query = '', page = 1, signal?: AbortSignal): Promise<{ profiles: ManagedProfile[]; total: number; page: number }> {
  const supabase = await createSupabaseServerClient();
  const request = supabase.rpc('search_managed_profiles', { p_query: query, p_page: page });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return data as unknown as { profiles: ManagedProfile[]; total: number; page: number };
}
