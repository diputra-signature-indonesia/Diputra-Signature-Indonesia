import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function HeroSection() {
  return (
    <section id="hero-section" className="brand-stretch *:font-raleway brand-section-px h-svh max-h-[700px] pb-16 lg:pb-20">
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col gap-14 md:gap-10 lg:gap-13 xl:gap-14">
        <div className="relative min-h-0 w-full flex-1">
          <Image
            src="/image/about-section.png"
            alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover brightness-90"
          />
        </div>
        <div className="my-auto flex flex-col max-md:items-center md:flex-1 lg:w-3xl">
          <p className="brand-p text-brand-black max-md:mb-4 max-md:text-center">— Company Overview</p>
          <h1 className="brand-h1 brand-h1-mb text-brand-burgundy w-full leading-[125%] text-balance max-md:text-center">
            Diputra <span className="brand-h1-semi text-brand-black font-medium">Signature Indonesia</span>
          </h1>
          <p className="brand-p-desc text-brand-black max-md:text-center">
            We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia. With years of experience, we help clients navigate complex regulations
            with confidence and ease.
          </p>
          <BrandButton asChild variant="yellow" className="mt-auto w-fit bg-transparent">
            <a href="#contact-section">
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
