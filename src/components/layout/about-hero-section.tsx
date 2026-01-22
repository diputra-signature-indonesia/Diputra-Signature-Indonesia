import IconArrow from '@/icons/BrandIconArrow';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

export function HeroSection() {
  return (
    <section id="hero-section" className="brand-stretch *:font-raleway relative h-svh max-h-[700px] pb-16 lg:pb-24">
      <div className="absolute h-full w-full bg-linear-to-tr from-black via-black/0 to-black/20 max-md:hidden" />
      <div className="brand-section-px relative mx-auto flex h-full max-w-[1440px] flex-col gap-14 md:gap-10 lg:gap-13 xl:gap-14">
        <div className="relative min-h-0 w-full flex-1">
          {/* <Image
            src="/image/about-section.png"
            alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover brightness-90"
          /> */}
        </div>
        <div className="my-auto flex flex-col max-md:items-center md:flex-1 lg:w-3xl">
          <Motion as="div" delay={0.2} duration={0.6} y={24} x={0} once={true}>
            <p className="brand-p text-brand-white mt-auto mb-2 max-md:mb-4 max-md:text-center">— Company Overview</p>
            <h1 className="brand-h1 brand-h1-mb text-brand-white w-full leading-[125%] text-balance max-md:text-center">
              Diputra <span className="brand-h1-semi text-brand-white font-medium">Signature Indonesia</span>
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
              <a href="#contact-section" className="text-brand-white">
                Contact Us
                <span>
                  <IconArrow className="text-brand-white size-5" />
                </span>
              </a>
            </BrandButton>
          </Motion>
        </div>
      </div>
    </section>
  );
}
