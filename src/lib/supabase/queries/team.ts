import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import type { Tables } from '@/types/database.generated';
import { cacheLife, cacheTag } from 'next/cache';

export type TeamMember = Tables<'team_members'>;

export type PublicTeamMember = Pick<TeamMember, 'id' | 'full_name' | 'job_title' | 'avatar_url'>;

/**
 * LIST team members (public website)
 * Hanya yang is_visible = true
 */
export async function getVisibleTeamMembers(): Promise<PublicTeamMember[]> {
  'use cache';
  cacheLife(PUBLIC_CACHE_LIFE);
  cacheTag(PUBLIC_CACHE_TAGS.team);

  const supabase = createSupabasePublicServerClient();

  const { data, error } = await supabase
    .from('team_members')
    .select(
      `
        id,
        full_name,
        job_title,
        avatar_url
      `
    )
    .eq('is_visible', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
