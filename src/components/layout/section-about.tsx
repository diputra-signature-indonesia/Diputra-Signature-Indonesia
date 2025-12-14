import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function AboutSection() {
  return (
    <section className="brand-stretch **:font-raleway relative flex">
      <div className="brand-section-px brand-section-py relative mx-auto flex w-full max-w-[1440px] flex-col gap-10 md:flex-row xl:gap-25">
        <div className="h-[200px] shrink-0 md:h-[380px] md:w-[250px] lg:h-[450px] lg:w-[350px] xl:h-[400px] xl:w-[500px]">
          <Image
            src={'/image/consultation_summary.webp'}
            alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
            quality={75}
            width={500}
            height={400}
            className="size-full object-cover"
          />
        </div>
        <div className="flex w-full flex-col gap-4">
          <p className="brand-p text-black">About Us</p>
          <h2 className="brand-h1 text-brand-burgundy border-brand-yellow border-l-4 pl-7 max-sm:leading-[90%]">
            Diputra <br className="sm:hidden" />
            <span className="brand-h1-semi text-brand-black"> Signature Indonesia</span>
          </h2>
          <p className="brand-p-desc text-black max-sm:text-pretty">
            We are a team of legal, business, and immigration professionals committed to providing accurate, reliable, and efficient solutions for clients in Indonesia. With years of experience, we
            help individuals and companies navigate various regulations and administrative processes safely, clearly, and without hassle.
          </p>
          <div className="flex w-full max-md:justify-end md:mt-auto">
            <BrandButton asChild variant="red" className="w-fit">
              <a href="#contact-section">
                Contact Us
                <span>
                  <IconArrow className="size-5 text-white" />
                </span>
              </a>
            </BrandButton>
          </div>
        </div>
      </div>
    </section>
  );
}
