import { BlogBodySection } from '@/components/layout/blog-body-section';
import { BlogHeadingSection } from '@/components/layout/blog-heading-section';
import { getAdminBlogPostBySlug } from '@/lib/supabase/queries';
import { notFound } from 'next/navigation';

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getAdminBlogPostBySlug(slug);
  if (!post) return notFound();

  return (
    <>
      <article aria-labelledby="post-title" className="py-6">
        <BlogHeadingSection title={post.title} excerpt={post.excerpt ?? ''} image={post.featured_image ?? ''} />
        <BlogBodySection content_md={post.content_md ?? ''} />
      </article>
    </>
  );
}
