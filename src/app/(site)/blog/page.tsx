import { BlogSection } from '@/components/layout/section-blog';

export const metadata = {
  title: 'Blog & Insights | Diputra Signature Indonesia',
  description: 'Read the latest articles and insights on legal updates, visa regulations, business compliance, and professional guidance for individuals and companies in Bali.',
};

export default function BlogListPage() {
  return (
    <div className="pt-5">
      <BlogSection />
    </div>
  );
}
