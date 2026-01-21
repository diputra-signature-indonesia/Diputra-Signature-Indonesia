import type { BlogPost } from '@/lib/supabase/queries';
import Image from 'next/image';
import Link from 'next/link';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

type BlogSectionProps = {
  blogPosts: BlogPost[]; // berapa item yang tampil
};

function formatDateParts(iso: string) {
  // iso: "2025-01-10"
  const [y, m, d] = iso.split('-');
  return { d, m, y };
}

export function BlogSection({ blogPosts }: BlogSectionProps) {
  // const posts = [...DSI_BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);

  return (
    <section className="brand-section-px brand-stretch font-raleway mx-auto flex flex-col justify-center gap-7 xl:h-[700px] xl:max-w-[1440px]">
      <div className="flex w-full flex-col items-end gap-7">
        <Motion as="div" delay={0.2} duration={0.6} y={0} x={100} once={true} className="flex w-xs flex-col items-end sm:w-sm lg:w-lg">
          <h2 className="brand-h1-semi brand-h1-mb border-brand-yellow border-r-4 pr-7">
            Latest <span className="brand-h1 text-brand-maroon">News</span>
          </h2>
          <p className="brand-p text-right"> Stay updated with the latest legal, government regulation, immigration, and business insights relevant to Bali and Indonesia.</p>
        </Motion>

        <div className="flex w-full justify-end gap-2.5">
          <input type="text" placeholder="Coming soon!" disabled className="w-full rounded-xl border px-5 py-2 text-xs font-light max-sm:max-w-3xs sm:max-w-80 sm:text-sm lg:max-w-96 lg:text-base" />
          <BrandButton variant="white" className="my-auto px-5 font-light sm:px-7 lg:px-10">
            Find
          </BrandButton>
        </div>
      </div>
      <div className="mx-auto grid w-full gap-x-10 lg:grid-cols-2 xl:max-w-7xl xl:grid-cols-3 xl:gap-y-10">
        {blogPosts.map((post, idx) => {
          const { d, m, y } = formatDateParts(post.published_at ?? '');
          const coverSrc = post.featured_image ?? '/image/news_image.png';
          return (
            <Motion key={post.slug} as="article" delay={0.2 + idx * 0.1} duration={0.6} y={0} x={-20} once={true} className="mb-3 flex h-fit w-full gap-2.5 sm:mb-5 lg:mb-10">
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
                      <div className="border-brand-yellow absolute -z-10 aspect-square h-[50px] -translate-x-1/2 border max-lg:-top-4 max-sm:-top-2 md:border-2 lg:h-full" />
                      <h3 className="brand-h3 text-brand-burgundy line-clamp-2 font-semibold sm:text-balance lg:min-h-13">{post.title}</h3>
                    </div>
                    <p className="line-clamp-3 font-light max-sm:hidden sm:text-sm lg:line-clamp-4 lg:min-h-20">{post.excerpt}</p>
                    <p className="text-[9px] sm:text-[12px] lg:hidden">{post.published_at}</p>
                  </div>
                </Link>
              </div>
            </Motion>
          );
        })}
      </div>
    </section>
  );
}
