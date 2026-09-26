import IconArrow from '@/icons/BrandIconArrow';
import Image from 'next/image';
import Link from 'next/link';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

export function HeroSection() {
  return (
    <section id="hero-section" className="brand-stretch *:font-raleway relative h-[calc(100svh-5rem)] max-h-[760px] min-h-[600px] overflow-hidden py-16 sm:py-20">
      <Image
        src="/image/about-hero-office-v3.webp"
        alt="Modern professional meeting room representing Diputra Signature Indonesia"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/90 via-black/65 via-50% to-black/10" />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/45 via-transparent to-black/10" />

      <div className="brand-section-px relative mx-auto flex h-full max-w-[1440px] items-center">
        <div className="flex max-w-[760px] flex-col max-md:items-center">
          <Motion as="div" delay={0.2} duration={0.6} y={24} x={0} once={true}>
            <p className="brand-p text-brand-white mt-auto mb-2 max-md:mb-4 max-md:text-center">— Company Overview</p>
            <h1 className="brand-h1 brand-h1-mb text-brand-white flex w-full flex-wrap items-baseline gap-x-4 gap-y-3 leading-[125%] text-balance max-md:justify-center max-md:text-center">
              <span className="sr-only">Diputra </span>
              <Image
                src="/image/diputra-wordmark-bright-red.png"
                alt=""
                aria-hidden="true"
                width={473}
                height={97}
                priority
                className="h-[clamp(2.5rem,4vw,3.6rem)] w-auto translate-y-[2px] object-contain drop-shadow-[0_2px_14px_rgba(236,32,54,0.25)]"
              />
              <span className="brand-h1-semi text-brand-white font-medium">Signature Indonesia</span>
            </h1>
          </Motion>
          <Motion as="div" delay={0.3} duration={0.6} y={24} x={0} once={true}>
            <p className="brand-p-desc text-brand-white max-md:text-center">
              We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia. With years of experience, we help clients navigate complex
              regulations with confidence and ease.
            </p>
          </Motion>
          <Motion as="div" delay={0.3} duration={0.6} y={24} x={0} once={true} className="w-fit">
            <BrandButton asChild variant="yellow" className="w-fit bg-transparent">
              <Link href="/contact" className="text-brand-white">
                Contact Us
                <span>
                  <IconArrow className="text-brand-white size-5" />
                </span>
              </Link>
            </BrandButton>
          </Motion>
        </div>
      </div>
    </section>
  );
}
