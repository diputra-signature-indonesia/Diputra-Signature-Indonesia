import IconArrow from '@/icons/BrandIconArrow';
import Image from 'next/image';
import Link from 'next/link';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

interface CategoryHeroSectionProps {
  heading: string;
  image: string;
  short_description?: string;
  description?: string;
}

export function CategoryHeroSection({ heading, image, short_description, description }: CategoryHeroSectionProps) {
  return (
    <section id={`category-hero`} aria-labelledby="category-hero-title" className="brand-stretch *:font-raleway brand-section-px h-svh max-h-[600px] py-16 lg:pb-20">
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col gap-14 md:flex-row md:gap-10 lg:gap-13 xl:gap-25">
        <Motion
          as="div"
          delay={0.2}
          duration={0.6}
          y={24}
          x={0}
          once={true}
          className="inner-shadow group shadow-brand-burgundy/20 relative w-full overflow-hidden rounded-xl pt-20 shadow-2xl transition-[rotate] duration-500 hover:rotate-0 max-md:flex-1 md:w-xs md:shrink-0 md:-rotate-2 xl:basis-lg"
        >
          <Image
            src={image}
            alt={`${heading} services in Bali by Diputra Signature Indonesia`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="scale-110 rounded-xl object-cover transition-transform duration-500 group-hover:scale-115 group-hover:rotate-0 md:rotate-2"
          />
        </Motion>
        <Motion as="div" delay={0.2} duration={0.6} y={24} x={0} once={true} className="my-auto flex flex-col max-md:items-center md:flex-1">
          <h1 id="category-hero-title" className="brand-h1 brand-h1-mb text-brand-burgundy w-full leading-[125%] text-balance max-md:text-center">
            {heading} <span className="brand-h1-semi text-brand-black font-medium">— Overview</span>
            {/*Overview bisa ganti ke “Services in Bali” atau “Consulting Services in Bali” sangat penting untuk category SEO*/}
          </h1>
          <p className="brand-p-desc text-brand-black max-md:text-center">{description ?? short_description}</p>
          <BrandButton asChild variant="yellow" className="mt-auto w-fit bg-transparent">
            <Link href="/contact">
              Contact Us
              <span>
                <IconArrow className="text-brand-black size-5" />
              </span>
            </Link>
          </BrandButton>
        </Motion>
      </div>
    </section>
  );
}
