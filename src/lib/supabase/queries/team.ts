import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import { cacheLife, cacheTag } from 'next/cache';

export type PublicTeamMember = {
  id: string;
  full_name: string;
  job_title: string;
  avatar_url: string | null;
  short_bio: string | null;
};

/**
 * LIST team members (public website)
 * Hanya yang is_visible = true
 */
export async function getVisibleTeamMembers(): Promise<PublicTeamMember[]> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.team);

  const supabase = createSupabasePublicServerClient();

  const { data, error } = await supabase.rpc('list_visible_team_members');

  if (error) throw error;
  return data ?? [];
}
