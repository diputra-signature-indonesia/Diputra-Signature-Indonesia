'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  createTeamProfilePhotoPath,
  TEAM_PROFILE_BUCKET,
  TEAM_PROFILE_CACHE_CONTROL,
  teamProfileUrlToPath,
} from '@/lib/team-profile-storage';

export async function uploadTeamProfilePhoto(profileId: string, file: File) {
  const supabase = createSupabaseBrowserClient();
  const path = createTeamProfilePhotoPath(profileId, file);
  const { error } = await supabase.storage.from(TEAM_PROFILE_BUCKET).upload(path, file, {
    cacheControl: TEAM_PROFILE_CACHE_CONTROL,
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { path, publicUrl: supabase.storage.from(TEAM_PROFILE_BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function deleteManagedTeamProfilePhoto(publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  const path = teamProfileUrlToPath(publicUrl);
  if (!path) return;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(TEAM_PROFILE_BUCKET).remove([path]);
  if (error) throw error;
}
