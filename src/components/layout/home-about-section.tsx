import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function AboutSection() {
  return (
    <section id="hero-section" className="brand-stretch font-raleway brand-section-px mx-auto mt-25 flex max-h-[700px] max-w-[1440px] max-md:flex-col sm:gap-10 lg:gap-20">
      <div className="my-auto aspect-square w-full max-w-3xl overflow-hidden rounded-sm max-md:mb-7 md:min-h-[420px]">
        <Image
          src={'/image/businessman-examining-papers-table.webp'}
          alt="team from Diputra Signature Indonesia"
          sizes="(max-width: 768px) 100vw"
          width={600}
          height={600}
          priority={true}
          className="h-full object-cover max-lg:w-full"
        />
      </div>
      <div className="my-auto flex w-full flex-col gap-5 lg:w-[550px] lg:min-w-[550px] xl:w-[650px] xl:min-w-[650px]">
        <p className="brand-p text-black">About Us</p>
        <h2 className="brand-h1 text-brand-burgundy border-brand-yellow border-l-4 pl-7 max-sm:leading-[90%]">
          Diputra <br className="sm:hidden" />
          <span className="brand-h1-semi text-brand-black"> Signature Indonesia</span>
        </h2>
        <p className="brand-p-desc text-black max-sm:text-pretty">
          We are a team of legal, business, and immigration professionals committed to providing accurate, reliable, and efficient solutions for clients in Indonesia. With years of experience, we help
          individuals and companies navigate various regulations and administrative processes safely, clearly, and without hassle.
        </p>
        <div className="flex w-full max-md:justify-end">
          <BrandButton asChild variant="red" className="mt-auto w-fit">
            <a href="#contact-section">
              Contact Us
              <span>
                <IconArrow className="text-brand-white size-5" />
              </span>
            </a>
          </BrandButton>
        </div>
      </div>
    </section>
  );
}
