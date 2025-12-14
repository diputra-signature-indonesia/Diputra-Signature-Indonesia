import Image from 'next/image';
import { BrandButton } from '../ui/button';

export function HeroSection() {
  return (
    <section
      id="hero-section"
      className="brand-stretch *:font-raleway brand-section-px relative mx-auto flex h-[95svh] max-w-[1440px] flex-col items-end justify-between pb-20 md:max-h-[700px] md:flex-row md:justify-center md:gap-10 lg:max-h-[750px] lg:gap-13 xl:gap-25"
    >
      <div className="mx-auto flex min-w-[280px] flex-col max-md:order-2 max-sm:w-full md:my-20 md:w-2xl lg:my-13 lg:basis-full xl:my-20">
        <div className="brand-h1-mb flex w-full flex-col gap-2.5">
          <h1 className="brand-h1 text-brand-black w-full leading-[125%] text-balance max-md:text-center">
            Comprehensive Legal Solutions, <span className="text-brand-burgundy">Simplified.</span>
          </h1>
          <div className="bg-brand-yellow h-1 w-25 max-md:mx-auto" />
        </div>
        <div className="mx-auto mb-5 flex w-full flex-col gap-5 max-md:items-center sm:mb-6 lg:mb-7 xl:border-l xl:border-white">
          <p className="brand-p-desc text-brand-black max-md:max-w-lg max-md:text-center xl:text-balance">
            Menyederhanakan kebutuhan bisnis, legal, dan imigrasi secara profesional, transparan, dan berintegritas.
          </p>
          <div className="mt-auto flex w-full max-w-[450px] gap-3 sm:gap-5 lg:w-96 xl:w-4/5">
            <BrandButton asChild variant="red" className="w-full justify-center max-sm:px-0">
              <a href="#contact-section">Consult Now</a>
            </BrandButton>
            <BrandButton asChild variant="yellow" className="w-full justify-center font-semibold max-sm:px-0">
              <a href="#services-section">Our Services</a>
            </BrandButton>
          </div>
        </div>
      </div>
      <div className="min-h-0 w-full flex-1 max-md:mb-7 md:h-full md:basis-4/5 lg:basis-full">
        <Image
          src={'/image/signing-business-contract.webp'}
          alt="team from Diputra Signature Indonesia"
          sizes="(max-width: 768px) 100vw, 600px"
          width={600}
          height={800}
          priority={true}
          className="h-full object-cover object-[30%_70%] max-lg:w-full"
        />
      </div>
    </section>
  );
}
