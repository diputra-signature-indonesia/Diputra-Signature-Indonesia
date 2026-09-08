import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type CurrentAuthor = Pick<Tables<'team_members'>, 'nickname' | 'full_name'>;

export async function getCurrentAuthorFromTeamMember(): Promise<CurrentAuthor | null> {
  const supabase = await createSupabaseServerClient();

  // 1️⃣ ambil user login
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  // 2️⃣ ambil team_member berdasarkan profile_id
  const { data, error } = await supabase
    .from('team_members')
    .select(
      `
      nickname,
      full_name
    `
    )
    .eq('profile_id', user.id)
    .single();

  if (error) {
    // kalau user login tapi belum punya row di team_members
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    nickname: data.nickname,
    full_name: data.full_name,
  };
}
