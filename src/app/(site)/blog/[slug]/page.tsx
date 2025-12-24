import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildBlogPostMetadata } from '@/lib/meta-helpers';
import { BlogHeadingSection } from '@/components/layout/blog-heading-section';
import { BlogBodySection } from '@/components/layout/blog-body-section';
import { buildDsiBlogPostingJsonLd } from '@/lib/schema-dsi';
import { getPublishedBlogPostBySlug } from '@/lib/supabase/queries';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPublishedBlogPostBySlug(slug);

    if (!post) {
      return {
        title: 'Blog | Diputra Signature Indonesia',
        description: 'Explore the latest legal, visa, and business insights in Bali.',
        robots: { index: false, follow: false },
      };
    }

    return buildBlogPostMetadata({
      slug: post.slug,
      title: post.title,
      description: post.excerpt,
      image: post.featured_image ?? '',
      date: post.published_at ?? '',
      updatedAt: post.updated_at ?? '',
    });
  } catch {
    return {
      title: 'Blog | Diputra Signature Indonesia',
      description: 'Explore the latest legal, visa, and business insights in Bali.',
      robots: { index: false, follow: false },
    };
  }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return notFound();

  const blogJsonLd = buildDsiBlogPostingJsonLd({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    description: post.excerpt,
    date: post.published_at ?? undefined,
    updatedAt: post.updated_at ?? undefined,
    coverImageUrl: post.featured_image ?? undefined,
    authorName: post.author_name ?? undefined,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <article aria-labelledby="post-title">
        <BlogHeadingSection title={post.title} excerpt={post.excerpt ?? ''} image={post.featured_image ?? ''} />
        <BlogBodySection content_md={post.content_md ?? ''} />
      </article>
    </>
  );
}
