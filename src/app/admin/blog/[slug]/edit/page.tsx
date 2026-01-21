import CreateBlogForm from '@/components/layout-admin/blog-form';
import { getBlogPostForEdit } from '@/lib/supabase/queries';
import { notFound } from 'next/navigation';

interface EditBlogProps {
  slug: string;
}

export default async function AdminEditBlogPage({ params }: { params: Promise<EditBlogProps> }) {
  const { slug } = await params;

  const editBlog = await getBlogPostForEdit(slug);
  if (!editBlog) return notFound();

  return (
    <section className="font-raleway flex h-full w-full flex-col px-4 py-6">
      <CreateBlogForm mode="edit" initialValues={editBlog} />
    </section>
  );
}
