import { getPublicCacheKeyParts, PUBLIC_CACHE_REVALIDATE_SECONDS, PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabasePublicServerClient } from '@/lib/supabase/public-server';
import { unstable_cache } from 'next/cache';

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

/**
 * LIST team members (public website)
 * Hanya yang is_visible = true
 */
async function fetchVisibleTeamMembers(): Promise<TeamMember[]> {
  const supabase = createSupabasePublicServerClient();

  const { data, error } = await supabase
    .from('team_members')
    .select(
      `
        id,
        full_name,
        job_title,
        short_bio,
        avatar_url,
        display_order
      `
    )
    .eq('is_visible', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export const getVisibleTeamMembers = unstable_cache(fetchVisibleTeamMembers, getPublicCacheKeyParts('visible-team-members'), {
  revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  tags: [PUBLIC_CACHE_TAGS.team],
});
