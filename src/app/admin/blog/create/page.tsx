import CreateBlogForm from '@/components/layout-admin/blog-form';
import { getCurrentAuthorFromTeamMember } from '@/lib/supabase/queries/admin';

export default async function AdminCreateBlogPage() {
  const author = await getCurrentAuthorFromTeamMember();

  const authorName = author?.full_name || 'Administrator';

  return (
    <section className="font-raleway flex h-full w-full flex-col px-4 py-6">
      <CreateBlogForm mode="create" authorName={authorName} />
    </section>
  );
}
