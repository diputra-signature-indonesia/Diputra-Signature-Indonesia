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
  initialRequests: PendingAccessRequest[];
  pendingRequestCount: number;
  jobTitles: TeamJobTitleOption[];
};

export async function getUserManagementData(options: { includeAccessRequests: boolean }): Promise<UserManagementData> {
  const supabase = await createSupabaseServerClient();
  const [profilesResult, teamResult, jobTitlesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,email,display_name,avatar_url,role,is_active,created_at,updated_at')
      .is('deleted_at', null)
      .order('display_name', { ascending: true, nullsFirst: false })
      .order('email', { ascending: true }),
    supabase.from('team_members').select('id,profile_id,full_name,short_bio,avatar_url,is_visible,job_title_id'),
    supabase.from('job_titles').select('id,name,sort_order,is_active').order('sort_order').order('name'),
  ]);

  if (profilesResult.error) {
    throw new Error(`Unable to load user profiles: ${profilesResult.error.message}`);
  }

  if (teamResult.error) {
    throw new Error(`Unable to load team profiles: ${teamResult.error.message}`);
  }
  if (jobTitlesResult.error) {
    throw new Error(`Unable to load Job titles: ${jobTitlesResult.error.message}`);
  }

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

  const jobTitleById = new Map((jobTitlesResult.data ?? []).map((title) => [title.id, title.name]));
  const teamByProfileId = new Map(
    (teamResult.data ?? [])
      .filter((member) => member.profile_id)
      .map((member) => [member.profile_id as string, { ...member, jobTitleName: member.job_title_id ? (jobTitleById.get(member.job_title_id) ?? null) : null }])
  );

  return {
    profiles: (profilesResult.data ?? []).map((profile) => ({ ...profile, teamMember: teamByProfileId.get(profile.id) ?? null })),
    initialRequests: requestsResult.data ?? [],
    pendingRequestCount: requestCountResult.count ?? 0,
    jobTitles: jobTitlesResult.data ?? [],
  };
}
