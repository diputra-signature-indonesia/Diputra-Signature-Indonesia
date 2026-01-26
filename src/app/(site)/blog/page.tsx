import { BlogSection } from '@/components/layout/section-blog';
import { getPublishedBlogPosts } from '@/lib/supabase/queries';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog & Insights',
  description: 'Read the latest articles and insights on legal updates, visa regulations, business compliance, and professional guidance for individuals and companies in Bali.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog & Insights',
    description: 'Read the latest articles and insights on legal updates, visa regulations, business compliance, and professional guidance for individuals and companies in Bali.',
    url: '/blog',
    images: ['/og/og-default.png'],
  },
};

export default async function BlogListPage() {
  const blogPosts = await getPublishedBlogPosts(12);
  return (
    <div className="py-13">
      <h1 className="sr-only">Blog & Insights</h1>
      <BlogSection blogPosts={blogPosts} />
    </div>
  );
}
