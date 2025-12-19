import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DSI_BLOG_POSTS } from '@/data/dsi-blog';
import { buildBlogPostMetadata } from '@/lib/meta-helpers';
import { BlogHeadingSection } from '@/components/layout/blog-heading-section';
import { BlogBodySection } from '@/components/layout/blog-body-section';

// helper kecil untuk cari post
function getPost(slug: string) {
  return DSI_BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return {
      title: 'Blog | Diputra Signature Indonesia',
      description: 'Explore latest news in Bali.',
    };
  }

  return buildBlogPostMetadata({
    title: post.title,
    date: post.date,
    description: post.excerpt,
  });
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return notFound();

  return (
    <>
      <BlogHeadingSection title={post.title} excerpt={post.excerpt} image={post.cover.src} />
      <BlogBodySection content_md={post.content_md} />
    </>
  );
}
