import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function HeroSection() {
  return (
    <section id="hero-section" className="md:bg-brand-black *:brand-stretch *:font-raleway">
      <div className="relative mx-auto flex max-w-[1440px]">
        <Image
          src="/image/about-section.png"
          alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
          quality={75}
          width={350}
          height={350}
          priority={true}
          className="lg:aspct-5/6 shrink-0 object-cover brightness-90 max-md:absolute max-md:-z-10 max-md:size-full max-md:brightness-40 md:w-[300px] lg:w-sm xl:aspect-5/6 xl:w-lg"
        />
        <div className="brand-section-px mt-auto flex flex-col pt-32 pb-16 max-md:items-center sm:pt-40">
          <p className="brand-p text-white max-md:mb-4 max-md:text-center">About Us</p>
          <h1 className="brand-h1 text-brand-yellow w-full leading-[125%] text-balance max-md:text-center">
            Diputra <span className="brand-h1-semi text-brand-white font-medium">Signature Indonesia</span>
          </h1>
          <p className="brand-p-desc text-brand-white max-md:text-center">
            We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia. With years of experience, we help clients navigate complex regulations
            with confidence and ease.
          </p>
          <BrandButton asChild variant="black" className="mt-auto w-fit bg-transparent">
            <a href="#contact-section">
              Contact Us
              <span>
                <IconArrow className="size-5 text-white" />
              </span>
            </a>
          </BrandButton>
        </div>
      </div>
    </section>
  );
}
