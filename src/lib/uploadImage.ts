import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export async function uploadEditorImage(file: File) {
  const supabase = createSupabaseBrowserClient();

  const ext = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `blog/${fileName}`;

  const { error } = await supabase.storage
    .from('images') // pastikan bucket ini ada
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('images').getPublicUrl(path);

  return { publicUrl: data.publicUrl, path };
}

export function extractImageSrcs(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('img'))
    .map((img) => img.getAttribute('src'))
    .filter(Boolean) as string[];
}

export function publicUrlToPath(publicUrl: string, bucketName = 'images'): string | null {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;

  const pathWithMaybeQuery = publicUrl.slice(idx + marker.length);
  return pathWithMaybeQuery.split('?')[0] || null;
}

export async function cleanupUnusedImages(contentHtml: string, uploadedPaths: string[]) {
  const supabase = createSupabaseBrowserClient();

  const usedSrcs = extractImageSrcs(contentHtml);

  const usedPathsArr = usedSrcs.map((src) => publicUrlToPath(src, 'images')).filter(Boolean) as string[];

  if (usedSrcs.length > 0 && usedPathsArr.length === 0) {
    console.warn('cleanupUnusedImages skipped: could not map img src to storage paths');
    return;
  }

  const usedPaths = new Set(usedPathsArr);

  const unused = uploadedPaths.filter((p) => !usedPaths.has(p));
  if (unused.length === 0) return;

  const { error } = await supabase.storage.from('images').remove(unused);
  if (error) throw error;
}

// blog cover images
export async function uploadCoverImage(file: File) {
  const supabase = createSupabaseBrowserClient();

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `blog_cover/${fileName}`; // folder cover

  const { error } = await supabase.storage.from('images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

// Cover Image Delete
export async function deleteImage(path: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from('images').remove([path]);
  if (error) throw error;
}
