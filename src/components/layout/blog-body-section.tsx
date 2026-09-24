import { sanitizeArticleHtml } from '@/lib/blog-content';

interface BlogBodySectionProps {
  content_md: string;
}

export function BlogBodySection({ content_md }: BlogBodySectionProps) {
  const safeHtml = sanitizeArticleHtml(content_md);

  return (
    <section aria-label="Article content" className="brand-stretch brand-section-px mx-auto max-w-[1440px] pb-16 lg:pb-20">
      <div className="mx-auto w-full max-w-4xl">
        <div className="article-public-content font-raleway" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </div>
    </section>
  );
}
