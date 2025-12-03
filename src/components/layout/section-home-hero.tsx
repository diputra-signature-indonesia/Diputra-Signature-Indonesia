import Image from 'next/image';
import { BrandButton } from '../ui/button';

export function HeroSection() {
  return (
    <section className="*:brand-stretch *:font-raleway relative flex min-h-svh">
      <Image src={'/image/home-hero-section.jpg'} alt="team from Diputra Signature Indonesia" fill priority={true} sizes="100vw" className="-z-10 object-cover brightness-50" />
      <div className="brand-section-px brand-section-py mx-auto flex max-w-[1440px] flex-col">
        <div className="mx-auto mt-auto flex flex-col gap-0 max-sm:w-full md:w-2xl xl:w-full xl:flex-row xl:gap-16">
          <h1 className="brand-h1 text-brand-white w-full leading-[125%] text-balance max-xl:text-center">
            Comprehensive Legal Solutions, <span className="text-brand-yellow">Simplified.</span>
          </h1>
          <div className="mx-auto mb-5 flex w-full flex-col gap-5 sm:mb-6 lg:mb-7 xl:border-l xl:border-white xl:pl-5">
            <p className="brand-p text-brand-white max-xl:text-center">Menyederhanakan kebutuhan bisnis, legal, dan imigrasi secara profesional, transparan, dan berintegritas.</p>
            <div className="mt-auto flex gap-3 sm:gap-5">
              <BrandButton asChild variant="yellow" className="w-full justify-center max-sm:px-0">
                <a href="#contact-section">Consult Now</a>
              </BrandButton>
              <BrandButton asChild variant="white" className="w-full justify-center font-semibold max-sm:px-0">
                <a href="#services-section">Our Services</a>
              </BrandButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
