import IconArrow from '@/icons/BrandIconArrow';
import Image from 'next/image';
import Link from 'next/link';
import { BrandButton } from '../ui/button';

interface CategoryHeroSectionProps {
  heading: string;
  image: string;
  short_description?: string;
  description?: string;
}

export function CategoryHeroSection({ heading, image, short_description, description }: CategoryHeroSectionProps) {
  return (
    <section id={`category-hero`} aria-labelledby="category-hero-title" className="brand-stretch *:font-raleway brand-section-px h-svh max-h-[600px] pb-16 lg:pb-20">
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col gap-14 md:flex-row md:gap-10 lg:gap-13 xl:gap-25">
        <div className="relative w-full pt-20 max-md:flex-1 md:w-xs md:shrink-0 xl:basis-lg">
          <Image src={image} alt={`${heading} services in Bali by Diputra Signature Indonesia`} fill sizes="(max-width: 768px) 100vw, 50vw" className="rounded-xl object-cover" />
        </div>
        <div className="my-auto flex flex-col max-md:items-center md:flex-1">
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
        </div>
      </div>
    </section>
  );
}
