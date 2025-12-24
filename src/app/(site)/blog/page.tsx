import type { Metadata } from 'next';
import { getPublishedBlogPosts } from '@/lib/supabase/queries';
import { BlogSection } from '@/components/layout/section-blog';

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
  },
};

export default async function BlogListPage() {
  const blogPosts = await getPublishedBlogPosts(12);
  return (
    <div className="pt-5">
      <h1 className="sr-only">Blog & Insights</h1>
      <BlogSection blogPosts={blogPosts} />
    </div>
  );
}
