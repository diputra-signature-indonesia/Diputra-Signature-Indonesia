import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DSI_BLOG_POSTS } from '@/data/dsi-blog';
import { buildBlogPostMetadata } from '@/lib/meta-helpers';
import { BlogHeadingSection } from '@/components/layout/blog-heading-section';
import { BlogBodySection } from '@/components/layout/blog-body-section';
import { buildDsiBlogPostingJsonLd } from '@/lib/schema-dsi';

function getPost(slug: string) {
  return DSI_BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export function generateStaticParams() {
  return DSI_BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return {
      title: 'Blog | Diputra Signature Indonesia',
      description: 'Explore the latest legal, visa, and business insights in Bali.',
      robots: { index: false, follow: false }, // optional: karena 404 case
    };
  }

  return buildBlogPostMetadata({
    slug: post.slug,
    title: post.title,
    description: post.excerpt,
    image: post.cover?.src,
    date: post.date,
    updatedAt: post.updatedAt,
  });
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return notFound();

  const blogJsonLd = buildDsiBlogPostingJsonLd({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    description: post.excerpt,
    date: post.date,
    updatedAt: post.updatedAt ?? null,
    coverImageUrl: post.cover?.src ?? null,
    authorName: post.authorName ?? null,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <article aria-labelledby="post-title">
        <BlogHeadingSection title={post.title} excerpt={post.excerpt} image={post.cover.src} />
        <BlogBodySection content_md={post.content_md} />
      </article>
    </>
  );
}
