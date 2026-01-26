import IconArrow from '@/icons/BrandIconArrow';
import Image from 'next/image';
import Link from 'next/link';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

export function HeroSection() {
  return (
    <section
      aria-label="Hero"
      id="hero-section"
      className="brand-stretch font-raleway brand-section-px relative mx-auto flex h-[85svh] max-w-[1440px] max-md:flex-col sm:h-svh sm:max-h-[650px] sm:gap-10 lg:gap-14"
    >
      {/* <div className="bg-brand-burgundy/10 absolute top-[-70%] left-[-20%] h-[300px] w-[300px] rounded-full mix-blend-multiply blur-3xl md:h-[600px] md:w-[600px]"></div> */}
      <div className="relative mx-auto my-auto flex w-full min-w-[280px] flex-col max-md:order-2 sm:min-w-[380px] lg:min-w-[450px]">
        <div className="bg-brand-yellow absolute top-0 -left-5 -z-10 size-10"></div>
        <div className="brand-h1-mb flex w-full flex-col gap-2.5">
          <Motion as="div" delay={0.2} duration={0.6} y={24} x={0} once={true} className="h-full w-full">
            <h1 className="text-brand-black w-full text-4xl leading-[125%] font-bold text-balance max-md:text-center sm:text-5xl lg:text-6xl">
              Comprehensive Legal Solutions, <span className="text-brand-burgundy">Simplified.</span>
            </h1>
          </Motion>
          <div className="bg-brand-yellow h-1 w-25 max-md:mx-auto" />
        </div>
        <div className="mx-auto flex w-full flex-col gap-5 max-md:items-center sm:mb-6 sm:gap-7 lg:mb-7 lg:gap-14 xl:border-l xl:border-white">
          <Motion as="div" delay={0.4} duration={0.6} y={24} x={0} once={true} className="h-full w-full">
            <p className="brand-p text-brand-black font-medium max-md:max-w-lg max-md:text-center xl:text-balance">
              Professional legal, business, and immigration support—transparent, reliable, and tailored for individuals and companies in Bali.
            </p>
          </Motion>
          <div className="w-full">
            <Motion as="div" delay={0.6} duration={0.6} y={24} x={0} once={true} className="flex w-full justify-center gap-3 sm:mx-auto sm:w-fit sm:gap-5 md:w-full md:flex-wrap md:justify-start">
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
            </Motion>
          </div>
        </div>
      </div>
      <div className="relative min-h-0 w-full flex-1 py-5 md:h-full md:basis-10/12 md:py-10 xl:pl-20">
        <Motion as="div" delay={0.4} duration={0.6} y={24} x={0} once={true} className="h-full w-full">
          <div className="shadow-brand-burgundy/20 group h-full overflow-hidden rounded-2xl shadow-2xl transition-transform duration-500 hover:rotate-0 max-lg:w-full md:-rotate-2">
            <Image
              src={'/image/brown-wooden-frame-glass-window.webp'}
              alt="team from Diputra Signature Indonesia"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 700px"
              width={700}
              height={800}
              priority={true}
              fetchPriority="high"
              className="h-full w-full scale-110 object-cover transition-transform duration-500 group-hover:scale-115 group-hover:rotate-0 md:rotate-2"
            />
          </div>
        </Motion>
        <div className="to-slate-10 from-brand-burgundy/40 to-brand-burgundy/5 absolute top-1/2 left-4/7 -z-10 h-[70%] w-full -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-2xl bg-linear-to-br opacity-20 max-md:hidden"></div>
      </div>
    </section>
  );
}
