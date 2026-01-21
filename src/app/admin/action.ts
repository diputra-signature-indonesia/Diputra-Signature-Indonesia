'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicUrlToPath } from '@/lib/uploadImage';
import { Status } from '@/types/blog-status';

export async function setBlogStatusAction(blogId: string, status: Status) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('blog_posts').update({ status }).eq('id', blogId);

  if (error) throw new Error(error.message);
}

function extractImageSrcsServer(html: string): string[] {
  if (!html) return [];

  // tangkap src="..." atau src='...' pada tag <img ...>
  const regex = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

  const out: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) out.push(match[1]);

  return out;
}

export async function deleteBlogAction(blogId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: post, error: fetchErr } = await supabase.from('blog_posts').select('id, featured_image, content_md').eq('id', blogId).single();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!post) throw new Error('Blog post not found');

  const paths = new Set<string>();

  if (post.featured_image) {
    const p = publicUrlToPath(post.featured_image, 'images');
    if (p) paths.add(p);
  }

  // content images
  const srcs = extractImageSrcsServer(post.content_md ?? '');
  for (const src of srcs) {
    const p = publicUrlToPath(src, 'images');
    if (p) paths.add(p);
  }

  if (paths.size > 0) {
    const { error: rmErr } = await supabase.storage.from('images').remove(Array.from(paths));

    // pilih salah satu:
    // a) kalau gagal, gagalkan delete (lebih "konsisten")
    if (rmErr) throw new Error(rmErr.message);

    // b) kalau kamu mau tetap lanjut delete row walau rm gagal:
    // if (rmErr) console.error('remove images error', rmErr);
  }

  const { error } = await supabase.from('blog_posts').delete().eq('id', blogId);

  if (error) throw new Error(error.message);
}
