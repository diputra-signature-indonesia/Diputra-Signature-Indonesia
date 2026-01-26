import IconArrow from '@/icons/BrandIconArrow';
import Image from 'next/image';
import Link from 'next/link';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

export function AboutSection() {
  return (
    <section className="brand-stretch font-raleway brand-section-px mx-auto mt-30 flex max-h-[700px] max-w-[1440px] flex-col sm:gap-5 md:gap-10 lg:flex-row lg:gap-20">
      <div className="my-auto aspect-video h-72 w-full overflow-hidden rounded-sm max-md:mb-7 md:h-[420px] lg:max-w-3xl">
        <Motion as="article" delay={0.2} duration={0.6} y={0} x={50} once={true} className="h-full w-full">
          <Image
            src={'/image/about-landing-page.webp'}
            alt="Legal and business consultation process at Diputra Signature Indonesia"
            sizes="(max-width: 768px) 100vw"
            width={600}
            height={600}
            priority={false}
            className="h-full rounded-xl object-cover max-lg:w-full"
          />
        </Motion>
      </div>
      <div className="my-auto w-full basis-full">
        <Motion as="article" delay={0.2} duration={0.6} y={0} x={-50} once={true} className="flex w-full flex-col gap-5">
          {/* <div className="my-auto flex w-full flex-col gap-5 lg:w-[550px] lg:min-w-[550px] xl:w-[650px] xl:min-w-[650px]"> */}
          <h2 className="brand-p text-black">About Us</h2>
          <h3 className="brand-h1 text-brand-burgundy border-brand-yellow border-l-4 pl-7 max-sm:leading-[90%]">
            Diputra <br className="sm:hidden" />
            <span className="brand-h1-semi text-brand-black"> Signature Indonesia</span>
          </h3>
          <p className="brand-p text-black max-sm:hidden max-sm:text-pretty">
            We are a team of legal, business, and immigration professionals committed to providing accurate, reliable, and efficient solutions for clients in Indonesia. With years of experience, we
            help individuals and companies navigate various regulations and administrative processes safely, clearly, and without hassle.
          </p>
          <p className="brand-p text-black max-sm:text-pretty sm:hidden">
            We are a team of legal, business, and immigration professionals providing accurate, reliable, and efficient solutions for clients in Indonesia.
          </p>
          <div className="mt-10 flex w-full max-lg:justify-end">
            <BrandButton asChild variant="red" className="mt-auto w-fit">
              <Link href="#contact-section">
                Contact Us
                <span>
                  <IconArrow className="text-brand-white size-5" />
                </span>
              </Link>
            </BrandButton>
          </div>
        </Motion>
      </div>
    </section>
  );
}
