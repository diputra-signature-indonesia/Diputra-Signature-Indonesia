import Link from 'next/link';
import { BrandButton } from '@/components/ui/button';
import { getAdminBlogPosts } from '@/lib/supabase/queries';
import { AdminBlogTableClient } from '@/components/ui/AdminBlogTableClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/admin/login'); // atau '/login'
  }

  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  const role = (profile?.role as 'super_admin' | 'admin' | 'editor' | 'contributor') ?? null;

  const blogPostsData = await getAdminBlogPosts();

  return (
    <div className="h-full px-4 py-6">
      <div className="brand-h1-mb flex items-center justify-between">
        <h1 className="brand-h2 font-bold">Blog List</h1>

        <BrandButton asChild variant="red" className="w-full justify-center max-sm:px-0 sm:w-fit">
          <Link href="/admin/blog/create">New Post</Link>
        </BrandButton>
      </div>

      <AdminBlogTableClient data={blogPostsData} role={role} />
    </div>
  );
}
