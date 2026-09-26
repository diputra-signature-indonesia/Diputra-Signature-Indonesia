import { BlogBodySection } from '@/components/layout/blog-body-section';
import { BlogHeadingSection } from '@/components/layout/blog-heading-section';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getAdminBlogPostBySlug } from '@/lib/supabase/queries';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [actor, post] = await Promise.all([requireActiveAdmin(), getAdminBlogPostBySlug(slug)]);
  if (!post) return notFound();
  const canEdit =
    post.archived_at === null &&
    (actor.role === 'admin' ||
      actor.role === 'super_admin' ||
      (post.created_by === actor.userId && (post.status === 'draft' || post.status === 'rejected')));

  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
        <Link href="/admin/blog" className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6674] hover:text-[#8C1010]"><ArrowLeft className="size-4" /> Back to Blogpost</Link>
        {canEdit ? (
          <Link href={`/admin/blog/${slug}/edit`} className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-4 text-[11px] font-semibold text-white hover:bg-[#7E0C0C]">
            Edit Article <Pencil className="size-3.5" />
          </Link>
        ) : null}
      </header>
      <article aria-labelledby="post-title" className="py-8">
        <BlogHeadingSection title={post.title ?? ''} excerpt={post.excerpt ?? ''} image={post.featured_image ?? ''} />
        <BlogBodySection content_md={post.content_md ?? ''} />
      </article>
    </div>
  );
}
