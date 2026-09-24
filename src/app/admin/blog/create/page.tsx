import { BlogEditorForm } from '@/components/admin-blog/blog-editor-form';
import { requireActiveAdmin } from '@/lib/auth/admin-access';

export default async function AdminCreateBlogPage() {
  const actor = await requireActiveAdmin();
  return <BlogEditorForm mode="create" authorName={actor.displayName || actor.email?.split('@')[0] || 'Diputra Team'} />;
}
