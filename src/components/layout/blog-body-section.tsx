'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BlogBodySectionProps {
  content_md: string;
}

export function BlogBodySection({ content_md }: BlogBodySectionProps) {
  return (
    <section className="brand-stretch brand-section-px mx-auto max-w-[1440px] pb-16 lg:pb-20">
      <div className="mx-auto w-full max-w-4xl">
        <article className="font-raleway">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="brand-h1-semi mb-5 font-semibold">{children}</h1>,
              h2: ({ children }) => <h2 className="brand-h2 mt-10 mb-4 font-semibold">{children}</h2>,
              h3: ({ children }) => <h3 className="brand-h3 mt-7 mb-3">{children}</h3>,

              p: ({ children }) => <p className="brand-p-desc mb-4 text-justify leading-relaxed">{children}</p>,

              ul: ({ children }) => <ul className="mb-4 list-disc pl-6">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 list-decimal pl-6">{children}</ol>,
              li: ({ children }) => <li className="brand-p-desc mb-2 leading-relaxed font-medium">{children}</li>,

              hr: () => <hr className="my-8 border-black/20" />,

              img: ({ ...props }) => (
                // sesuai request kamu: gambar jangan segede gaban
                <img {...props} className="my-7 h-[300px] w-full rounded-sm object-cover" alt={props.alt ?? ''} />
              ),
            }}
          >
            {content_md}
          </ReactMarkdown>
        </article>
      </div>
    </section>
  );
}
