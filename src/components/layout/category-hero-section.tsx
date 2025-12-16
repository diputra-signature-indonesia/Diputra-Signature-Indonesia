import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

interface CategoryHeroSectionProps {
  heading: string;
  subheading?: string;
  image: string;
  short_description?: string;
  description?: string;
}

export function CategoryHeroSection({ heading, image, subheading, short_description, description }: CategoryHeroSectionProps) {
  return (
    <section id="hero-section" className="brand-stretch *:font-raleway brand-section-px h-svh max-h-[600px] pb-16 lg:pb-20">
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col gap-14 md:flex-row md:gap-10 lg:gap-13 xl:gap-25">
        <div className="relative w-full max-md:flex-1 md:w-xs md:shrink-0 xl:basis-lg">
          <Image
            src={image}
            alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
            fill
            priority
            sizes="(max-width: 768px) 100vw"
            className="object-cover"
          />
        </div>
        <div className="my-auto flex flex-col max-md:items-center md:flex-1">
          <h1 className="brand-h1 brand-h1-mb text-brand-burgundy w-full leading-[125%] text-balance max-md:text-center">
            {heading} <span className="brand-h1-semi text-brand-black font-medium">— Overview</span>
          </h1>
          <p className="brand-p-desc text-brand-black max-md:text-center">{description}</p>
          <BrandButton asChild variant="yellow" className="mt-auto w-fit bg-transparent">
            <a href="/contact">
              Contact Us
              <span>
                <IconArrow className="text-brand-black size-5" />
              </span>
            </a>
          </BrandButton>
        </div>
      </div>
    </section>
  );
}
