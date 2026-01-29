import { AdminBlogTableClient } from '@/components/ui/AdminBlogTableClient';
import { BrandButton } from '@/components/ui/button';
import { getAdminBlogPosts } from '@/lib/supabase/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type SearchParams = { page?: string; pageSize?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = (profile?.role as 'super_admin' | 'admin' | 'editor' | 'contributor') ?? null;

  const page = Math.max(0, Number(sp.page ?? '0') || 0);
  const pageSize = [5, 10, 25, 50].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 10;

  const { data: blogPostsData, count } = await getAdminBlogPosts({ page, pageSize });

  return (
    <div className="h-full px-4 py-6">
      <div className="brand-h1-mb flex items-center justify-between rounded-2xl border border-gray-200 px-5 py-4 shadow-sm">
        <h1 className="brand-h2 font-bold">Blog List</h1>

        <BrandButton asChild variant="red" className="w-full justify-center max-sm:px-0 sm:w-fit">
          <Link href="/admin/blog/create">New Post</Link>
        </BrandButton>
      </div>

      <AdminBlogTableClient data={blogPostsData} role={role} page={page} pageSize={pageSize} totalCount={count} />
    </div>
  );
}
