import Image from 'next/image';
import { BrandButton } from '../ui/button';

export function BlogSection() {
  const posts = [
    {
      id: 1,
      title: 'KITAS Optimization in 2025: What Has Changed?',
      excerpt:
        'The Indonesian government has updated regulations for limited stay permits (KITAS), focusing on faster processing and stronger data integration. This article highlights what applicants in Bali and the rest of Indonesia need to pay attention to.',
      date: '01/12/2025',
    },
    {
      id: 2,
      title: 'New Business Visa Rules: Key Requirements to Prepare',
      excerpt:
        'Starting in 2025, business visas have new document requirements and adjusted validity periods. These changes aim to improve transparency and make it easier for foreign entrepreneurs to enter Indonesia, including those operating in Bali.',
      date: '20/11/2025',
    },
    {
      id: 3,
      title: 'Latest OSS RBA Implementation: Impact on Business Licensing',
      excerpt: 'The latest OSS RBA features automatic validation to make licensing more accurate and efficient. This article explains key changes and how business owners in Bali can prepare.',
      date: '08/11/2025',
    },
    {
      id: 4,
      title: 'Regional Tax Harmonization for Businesses in Bali',
      excerpt:
        'Local authorities in Bali have introduced new policies for regional taxes and levies. The goal is to simplify administration and improve compliance for both local and foreign businesses.',
      date: '01/11/2025',
    },
    {
      id: 5,
      title: 'Updates on Foreign Manpower Regulations in 2025',
      excerpt:
        'The Ministry of Manpower has issued new regulations on the use of foreign workers, including RPTKA procedures and work notifications. These updates aim to improve legal certainty for companies operating in Indonesia.',
      date: '25/10/2025',
    },
  ];

  return (
    <section className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col gap-7">
      <div className="flex w-full flex-col items-end">
        <div className="flex w-xs flex-col items-end sm:w-sm lg:w-lg">
          <h2 className="brand-h1-semi brand-h1-mb border-brand-yellow border-r-4 pr-7">
            Latest <span className="brand-h1 text-brand-maroon">News</span>
          </h2>
          <p className="brand-p-desc text-right text-balance"> Stay updated with the latest legal, government regulation, immigration, and business insights relevant to Bali and Indonesia.</p>
        </div>

        <div className="flex w-full justify-end gap-2.5">
          <input type="text" placeholder="Search articles" className="w-full rounded-xl border px-5 py-2 text-xs font-light max-sm:max-w-3xs sm:max-w-80 sm:text-sm lg:max-w-96 lg:text-base" />
          <BrandButton variant="white" className="my-auto px-5 font-light sm:px-7 lg:px-10">
            Find
          </BrandButton>
        </div>
      </div>
      <div className="mx-auto grid w-full gap-x-10 lg:grid-cols-2 xl:max-w-7xl xl:grid-cols-3 xl:gap-y-10">
        {posts.map((post) => (
          <article key={post.id} className="mb-3 flex h-fit w-full gap-2.5 sm:mb-5 lg:mb-10">
            <div className="flex w-fit flex-col text-[14px] max-lg:hidden">
              <p className="border-b pb-2.5">{post.date.slice(0, 2)}</p>
              <p className="border-b py-2.5">{post.date.slice(3, 5)}</p>
              <p className="pt-2.5">{post.date.slice(6)}</p>
            </div>
            <div className="flex w-full lg:flex-col">
              <Image
                alt={`${post.title} – legal and visa update for Indonesia`}
                src={'/image/news_image.png'}
                width={300}
                quality={75}
                height={200}
                sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 45vw, 100vw"
                className="max-h-44 object-cover max-sm:h-20 max-sm:w-36 sm:w-2/5 lg:h-[200px] lg:w-full"
              />
              <div className="flex w-full flex-col gap-1 p-2 sm:gap-2.5 lg:p-5">
                <div className="relative w-full">
                  <div className="border-brand-yellow absolute -z-10 aspect-square h-[50px] -translate-x-1/2 border max-lg:-top-4 max-sm:-top-2 md:border-2 lg:h-full" />
                  <h3 className="brand-h3 text-brand-burgundy line-clamp-2 font-semibold sm:text-balance lg:min-h-13">{post.title}</h3>
                </div>
                <p className="line-clamp-3 font-light max-sm:hidden sm:text-sm lg:line-clamp-4 lg:min-h-20">{post.excerpt}</p>
                <p className="text-[9px] sm:text-[12px] lg:hidden">{post.date}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
