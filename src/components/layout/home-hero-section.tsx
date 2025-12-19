import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section
      aria-label="Hero"
      id="hero-section"
      className="brand-stretch font-raleway brand-section-px mx-auto flex h-[85svh] max-w-[1440px] max-md:flex-col sm:h-svh sm:max-h-[650px] sm:gap-10 lg:gap-20"
    >
      <div className="mx-auto my-auto flex w-full max-w-[550px] min-w-[280px] flex-col max-md:order-2 sm:min-w-[380px] lg:min-w-[450px]">
        <div className="brand-h1-mb flex w-full flex-col gap-2.5">
          <h1 className="brand-h1 text-brand-black w-full leading-[125%] text-balance max-md:text-center">
            Comprehensive Legal Solutions, <span className="text-brand-burgundy">Simplified.</span>
          </h1>
          <div className="bg-brand-yellow h-1 w-25 max-md:mx-auto" />
        </div>
        <div className="mx-auto flex w-full flex-col gap-5 max-md:items-center sm:mb-6 sm:gap-7 lg:mb-7 lg:gap-14 xl:border-l xl:border-white">
          <p className="brand-p text-brand-black font-medium max-md:max-w-lg max-md:text-center xl:text-balance">
            Professional legal, business, and immigration support—transparent, reliable, and tailored for individuals and companies in Bali.
          </p>
          <div className="flex w-full justify-center gap-3 sm:mx-auto sm:w-fit sm:gap-5 md:w-full md:flex-wrap md:justify-start">
            <BrandButton asChild variant="red" className="w-full justify-center max-sm:px-0 sm:w-fit">
              <Link href="/contact">Consult Now</Link>
            </BrandButton>
            <BrandButton asChild variant="yellow" className="w-full justify-center font-semibold max-sm:px-0 sm:w-fit">
              <Link href="/services">
                Our Services
                <span>
                  <IconArrow className="text-brand-black size-5" />
                </span>
              </Link>
            </BrandButton>
          </div>
        </div>
      </div>
      <div className="min-h-0 w-full flex-1 max-md:mb-7 md:h-full md:basis-full">
        <Image
          src={'/image/brown-wooden-frame-glass-window.webp'}
          alt="team from Diputra Signature Indonesia"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 700px"
          width={700}
          height={800}
          priority={true}
          fetchPriority="high"
          className="h-full object-cover max-lg:w-full"
        />
      </div>
    </section>
  );
}
