import { createSupabaseServerClient } from '@/lib/supabase/server';

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
export async function getVisibleTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createSupabaseServerClient();

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
