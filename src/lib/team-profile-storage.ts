export const TEAM_PROFILE_BUCKET = 'team_profile';
export const TEAM_PROFILE_FOLDER = 'profiles';
export const TEAM_PROFILE_CACHE_CONTROL = '31536000';
export const TEAM_PROFILE_MAX_BYTES = 1024 * 1024;
export const TEAM_PROFILE_MAX_LABEL = '1 MiB';
export const TEAM_PROFILE_ACCEPT = 'image/jpeg,image/png,image/webp';

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export function validateTeamProfilePhotoFile(file: Pick<File, 'size' | 'type'>) {
  const extension = EXTENSION_BY_MIME[file.type as keyof typeof EXTENSION_BY_MIME];
  if (!extension) throw new Error('Foto profil wajib berformat JPEG, PNG, atau WebP.');
  if (file.size > TEAM_PROFILE_MAX_BYTES) throw new Error(`Ukuran foto profil maksimal ${TEAM_PROFILE_MAX_LABEL}.`);
  return extension;
}

export function createTeamProfilePhotoPath(profileId: string, file: Pick<File, 'size' | 'type'>) {
  const extension = validateTeamProfilePhotoFile(file);
  return `${TEAM_PROFILE_FOLDER}/${profileId}/${crypto.randomUUID()}.${extension}`;
}

export function teamProfileUrlToPath(publicUrl: string) {
  const marker = `/storage/v1/object/public/${TEAM_PROFILE_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  const path = publicUrl.slice(markerIndex + marker.length).split('?')[0];
  return path.startsWith(`${TEAM_PROFILE_FOLDER}/`) ? path : null;
}
