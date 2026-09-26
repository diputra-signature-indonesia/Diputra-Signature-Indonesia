import { BlogEditorForm } from '@/components/admin-blog/blog-editor-form';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getBlogPostForEdit, getBlogPostRevisions } from '@/lib/supabase/queries';
import { notFound, redirect } from 'next/navigation';

interface EditBlogProps {
  slug: string;
}

export default async function AdminEditBlogPage({ params }: { params: Promise<EditBlogProps> }) {
  const { slug } = await params;
  const [actor, editBlog] = await Promise.all([requireActiveAdmin(), getBlogPostForEdit(slug)]);
  if (!editBlog) return notFound();
  const canEdit = actor.role === 'admin' || actor.role === 'super_admin' || (editBlog.createdBy === actor.userId && (editBlog.status === 'draft' || editBlog.status === 'rejected'));
  if (!canEdit) redirect(`/admin/blog/preview/${editBlog.slug}`);
  const revisions = await getBlogPostRevisions(editBlog.id);
  return <BlogEditorForm mode="edit" post={editBlog} revisions={revisions} authorName={actor.displayName || actor.email?.split('@')[0] || 'Diputra Team'} />;
}
