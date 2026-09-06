import { PUBLIC_CACHE_LIFE, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import { cacheLife, cacheTag } from 'next/cache';

export type TeamMember = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  short_bio: string | null;
  avatar_url: string | null;
  display_order: number | null;
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

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
  return (data ?? []) as PublicTeamMember[];
}
