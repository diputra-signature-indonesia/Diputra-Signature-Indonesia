import Image from 'next/image';
import { BrandButton } from '../ui/button';

export function HeroSection() {
  return (
    <section id="hero-section" className="*:brand-stretch *:font-raleway brand-section-px relative mx-auto flex h-svh max-w-[1440px] items-end justify-center gap-25 pb-20">
      <div className="my-20 flex basis-full flex-col">
        <div className="brand-h1-mb flex w-full flex-col gap-2.5">
          <h1 className="brand-h1 text-brand-black w-full leading-[125%] text-balance max-xl:text-center">
            Comprehensive Legal Solutions, <span className="text-brand-burgundy">Simplified.</span>
          </h1>
          <div className="bg-brand-yellow h-1 w-25" />
        </div>
        <div className="mx-auto mb-5 flex w-full flex-col gap-5 sm:mb-6 lg:mb-7 xl:border-l xl:border-white">
          <p className="brand-p-desc text-brand-black text-balance max-xl:text-center">Menyederhanakan kebutuhan bisnis, legal, dan imigrasi secara profesional, transparan, dan berintegritas.</p>
          <div className="mt-auto flex w-4/5 gap-3 sm:gap-5">
            <BrandButton asChild variant="red" className="w-full justify-center max-sm:px-0">
              <a href="#contact-section">Consult Now</a>
            </BrandButton>
            <BrandButton asChild variant="yellow" className="w-full justify-center font-semibold max-sm:px-0">
              <a href="#services-section">Our Services</a>
            </BrandButton>
          </div>
        </div>
      </div>
      <div className="h-full basis-full">
        <Image src={'/image/home-hero-section.jpg'} alt="team from Diputra Signature Indonesia" width={600} height={800} priority={true} className="h-full object-cover brightness-50" />
      </div>
    </section>
  );
}
