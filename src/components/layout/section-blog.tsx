import type { BlogPostSummary } from '@/lib/supabase/queries';
import { Newspaper } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandButton } from '../ui/button';
import { ViewportReveal } from '../viewport-reveal';

type BlogSectionProps = {
  blogPosts: BlogPostSummary[]; // berapa item yang tampil
  emptyState?: 'hide' | 'message';
};

function formatDateParts(iso: string) {
  // iso: "2025-01-10"
  const [y, m, d] = iso.split('-');
  return { d, m, y };
}

export function BlogSection({ blogPosts, emptyState = 'hide' }: BlogSectionProps) {
  // const posts = [...DSI_BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);

  if (!blogPosts.length) {
    if (emptyState === 'hide') return null;

    return (
      <section aria-labelledby="empty-blog-heading" className="brand-section-px font-raleway mx-auto flex min-h-[52vh] max-w-[1440px] items-center justify-center py-16">
        <ViewportReveal as="div" delay={0.1} duration={0.5} y={20} x={0} className="flex max-w-2xl flex-col items-center text-center">
          <div className="border-brand-maroon/15 bg-brand-maroon/5 text-brand-maroon mb-6 flex size-16 items-center justify-center rounded-full border">
            <Newspaper aria-hidden="true" className="size-7" strokeWidth={1.6} />
          </div>
          <h2 id="empty-blog-heading" className="brand-h2 text-brand-maroon font-semibold">
            News is on the way
          </h2>
          <p className="brand-p-desc mt-4 max-w-xl text-balance text-[#595959]">Sorry, we haven&apos;t published any news yet. Stay tuned for our latest updates, insights, and important announcements.</p>
          <div aria-hidden="true" className="bg-brand-yellow mt-7 h-1 w-14 rounded-full" />
        </ViewportReveal>
      </section>
    );
  }

  return (
    <section className="brand-section-px brand-stretch font-raleway mx-auto flex flex-col justify-center gap-7 xl:h-[700px] xl:max-w-[1440px]">
      <div className="flex w-full flex-col items-end gap-7">
        <ViewportReveal as="div" delay={0.2} duration={0.6} y={0} x={100} className="flex w-xs flex-col items-end sm:w-sm lg:w-lg">
          <h2 className="brand-h1-semi brand-h1-mb border-brand-yellow border-r-4 pr-7">
            Latest <span className="brand-h1 text-brand-maroon">News</span>
          </h2>
          <p className="brand-p text-right"> Stay updated with the latest legal, government regulation, immigration, and business insights relevant to Bali and Indonesia.</p>
        </ViewportReveal>

        <ViewportReveal as="div" delay={0.2} duration={0.6} y={0} x={100} className="flex w-full justify-end gap-2.5">
          <input type="text" placeholder="Coming soon!" disabled className="w-full rounded-xl border px-5 py-2 text-xs font-light max-sm:max-w-3xs sm:max-w-80 sm:text-sm lg:max-w-96 lg:text-base" />
          <BrandButton variant="white" className="my-auto px-5 font-light sm:px-7 lg:px-10">
            Find
          </BrandButton>
        </ViewportReveal>
      </div>
      <div className="mx-auto grid w-full gap-x-10 lg:grid-cols-2 xl:max-w-7xl xl:grid-cols-3 xl:gap-y-10">
        {blogPosts.map((post, idx) => {
          const { d, m, y } = formatDateParts(post.published_at ?? '');
          const coverSrc = post.featured_image ?? '/image/news_image.png';
          return (
            <ViewportReveal key={post.slug} as="article" delay={0.2 + idx * 0.1} duration={0.6} y={0} x={-20} className="mb-3 flex h-fit w-full gap-2.5 sm:mb-5 lg:mb-10">
              <div className="flex w-fit flex-col text-[14px] max-lg:hidden">
                <p className="border-b pb-2.5">{d}</p>
                <p className="border-b py-2.5">{m}</p>
                <p className="pt-2.5">{y}</p>
              </div>
              <div className="w-full">
                <Link href={`/blog/${post.slug}`} className="flex w-full lg:flex-col">
                  <Image
                    alt={`${post.title} cover image`}
                    src={coverSrc}
                    width={300}
                    quality={75}
                    height={200}
                    sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 45vw, 100vw"
                    className="max-h-44 rounded-xl object-cover max-sm:h-20 max-sm:w-36 sm:w-2/5 lg:h-[200px] lg:w-full"
                  />
                  <div className="flex w-full flex-col gap-1 p-2 sm:gap-2.5 lg:p-5">
                    <div className="relative w-full">
                      <h3 className="brand-h3 text-brand-burgundy line-clamp-2 font-semibold sm:text-balance lg:min-h-13">{post.title}</h3>
                    </div>
                    <p className="line-clamp-3 font-light max-sm:hidden sm:text-sm lg:line-clamp-4 lg:min-h-20">{post.excerpt}</p>
                    <p className="text-[9px] sm:text-[12px] lg:hidden">{post.published_at}</p>
                  </div>
                </Link>
              </div>
            </ViewportReveal>
          );
        })}
      </div>
    </section>
  );
}
