'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Status } from '@/types/blog-status';

export async function setBlogStatusAction(blogId: string, status: Status) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('blog_posts').update({ status }).eq('id', blogId);

  if (error) throw new Error(error.message);
}

export async function deleteBlogAction(blogId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('blog_posts').delete().eq('id', blogId);

  if (error) throw new Error(error.message);
}
