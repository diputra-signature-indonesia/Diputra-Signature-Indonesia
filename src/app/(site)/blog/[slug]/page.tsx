import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildBlogPostMetadata } from '@/lib/meta-helpers';
import { BlogHeadingSection } from '@/components/layout/blog-heading-section';
import { BlogBodySection } from '@/components/layout/blog-body-section';
import { articleWordCount } from '@/lib/blog-content';
import { buildBlogBreadcrumbJsonLd, buildDsiBlogPostingJsonLd, serializeJsonLd } from '@/lib/schema-dsi';
import { getPublishedBlogPostBySlug } from '@/lib/supabase/queries';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) notFound();

  return buildBlogPostMetadata({
    slug: post.slug,
    title: post.seo_title || post.title || '',
    description: post.seo_description || post.excerpt || '',
    image: post.featured_image ?? '',
    date: post.published_at ?? '',
    updatedAt: post.updated_at ?? '',
    author: post.author_name ?? undefined,
    category: post.category,
    tags: post.tags,
    imageAlt: post.cover_alt ?? post.title ?? undefined,
  });
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return notFound();

  const blogJsonLd = buildDsiBlogPostingJsonLd({
    slug: post.slug,
    title: post.title ?? '',
    excerpt: post.excerpt ?? '',
    description: post.excerpt ?? '',
    date: post.published_at ?? undefined,
    updatedAt: post.updated_at ?? undefined,
    coverImageUrl: post.featured_image ?? undefined,
    authorName: post.author_name ?? undefined,
    category: post.category,
    tags: post.tags,
    wordCount: articleWordCount(post.content_md ?? ''),
    readingTimeMinutes: post.reading_time_min,
  });
  const breadcrumbJsonLd = buildBlogBreadcrumbJsonLd(post.slug, post.title ?? 'Article');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <article aria-labelledby="post-title">
        <BlogHeadingSection title={post.title ?? ''} excerpt={post.excerpt ?? ''} image={post.featured_image ?? ''} imageAlt={post.cover_alt ?? undefined} category={post.category} author={post.author_name ?? undefined} publishedAt={post.published_at} readingTimeMinutes={post.reading_time_min} />
        <BlogBodySection content_md={post.content_md ?? ''} />
      </article>
    </>
  );
}
