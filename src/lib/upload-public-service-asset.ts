'use client';

import { createPublicServiceImagePath, createPublicServiceSvgPath, PUBLIC_SERVICE_ASSET_BUCKET, PUBLIC_SERVICE_ASSET_CACHE_CONTROL, publicServiceAssetUrlToPath } from '@/lib/public-service-storage';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

async function upload(path: string, file: File) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(PUBLIC_SERVICE_ASSET_BUCKET).upload(path, file, {
    cacheControl: PUBLIC_SERVICE_ASSET_CACHE_CONTROL,
    contentType: file.type || (path.endsWith('.svg') ? 'image/svg+xml' : undefined),
    upsert: false,
  });
  if (error) throw error;
  return { path, publicUrl: supabase.storage.from(PUBLIC_SERVICE_ASSET_BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function uploadPublicServiceImage(file: File) {
  return upload(createPublicServiceImagePath(file), file);
}

export async function uploadPublicServiceSvg(file: File) {
  return upload(await createPublicServiceSvgPath(file), file);
}

export async function deletePublicServiceAssetUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  const path = publicServiceAssetUrlToPath(publicUrl);
  if (!path) return;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(PUBLIC_SERVICE_ASSET_BUCKET).remove([path]);
  if (error) throw error;
}
