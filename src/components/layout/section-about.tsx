import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function AboutSection() {
  return (
    <section className="**:brand-stretch **:font-raleway bg-brand-black relative flex">
      <div className="brand-section-px brand-section-py relative mx-auto flex w-full max-w-[1440px] flex-col gap-10 sm:flex-row xl:gap-25">
        <Image
          src={'/image/about-section.png'}
          alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
          quality={75}
          width={350}
          height={350}
          className="aspect-square object-cover max-sm:hidden sm:w-[200px] md:h-[325px] md:w-[250px] lg:h-[375px] lg:w-[300px] xl:size-[350px]"
        />
        <div className="flex flex-col gap-4">
          <p className="brand-p text-white">About Us</p>
          <h2 className="brand-h1 text-brand-yellow max-sm:leading-[90%]">
            Diputra <br className="sm:hidden" />
            <span className="brand-h1-semi text-brand-white"> Signature Indonesia</span>
          </h2>
          <p className="brand-p text-white">
            Kami adalah tim profesional di bidang hukum, bisnis, dan imigrasi yang berkomitmen memberikan solusi yang tepat, terpercaya, dan efisien untuk klien di Indonesia. Dengan pengalaman
            bertahun-tahun, kami membantu individu dan perusahaan dalam menavigasi berbagai regulasi dan proses administratif secara aman, jelas, dan tanpa kerumitan.
          </p>
          <div className="mt-7 flex w-full max-md:justify-end md:mt-auto">
            <BrandButton asChild variant="black" className="w-fit">
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
