import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { BLOG_IMAGE_BUCKET, BLOG_IMAGE_CACHE_CONTROL, BLOG_IMAGE_COVER_FOLDER, BLOG_IMAGE_EDITOR_FOLDER, createBlogImagePath } from '@/lib/blog-image-storage';

async function uploadBlogImage(file: File, folder: typeof BLOG_IMAGE_EDITOR_FOLDER | typeof BLOG_IMAGE_COVER_FOLDER) {
  const supabase = createSupabaseBrowserClient();
  const path = createBlogImagePath(folder, file);

  const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).upload(path, file, {
    cacheControl: BLOG_IMAGE_CACHE_CONTROL,
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(path);

  return { publicUrl: data.publicUrl, path };
}

export async function uploadEditorImage(file: File) {
  return uploadBlogImage(file, BLOG_IMAGE_EDITOR_FOLDER);
}

export function extractImageSrcs(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('img'))
    .map((img) => img.getAttribute('src'))
    .filter(Boolean) as string[];
}

export function publicUrlToPath(publicUrl: string, bucketName = BLOG_IMAGE_BUCKET): string | null {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;

  const pathWithMaybeQuery = publicUrl.slice(idx + marker.length);
  return pathWithMaybeQuery.split('?')[0] || null;
}

export async function cleanupUnusedImages(contentHtml: string, uploadedPaths: string[]) {
  const supabase = createSupabaseBrowserClient();

  const usedSrcs = extractImageSrcs(contentHtml);

  const usedPathsArr = usedSrcs.map((src) => publicUrlToPath(src, BLOG_IMAGE_BUCKET)).filter(Boolean) as string[];

  if (usedSrcs.length > 0 && usedPathsArr.length === 0) {
    console.warn('cleanupUnusedImages skipped: could not map img src to storage paths');
    return;
  }

  const usedPaths = new Set(usedPathsArr);

  const unused = uploadedPaths.filter((p) => !usedPaths.has(p));
  if (unused.length === 0) return;

  const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).remove(unused);
  if (error) throw error;
}

// blog cover images
export async function uploadCoverImage(file: File) {
  return uploadBlogImage(file, BLOG_IMAGE_COVER_FOLDER);
}

// Cover Image Delete
export async function deleteImage(path: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}
