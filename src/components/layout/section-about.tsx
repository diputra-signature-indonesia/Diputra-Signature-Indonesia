import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function AboutSection() {
  return (
    <section className="**:brand-stretch **:font-raleway relative flex">
      <div className="brand-section-px brand-section-py relative mx-auto flex w-full max-w-[1440px] flex-col gap-10 sm:flex-row xl:gap-25">
        <div className="h-[400px] w-[500px] shrink-0">
          <Image
            src={'/image/about-section.png'}
            alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
            quality={75}
            width={500}
            height={400}
            className="size-full object-cover max-sm:hidden"
          />
        </div>
        {/* sm:w-[200px] md:h-[325px] md:w-[250px] lg:h-[375px] lg:w-[300px] */}
        <div className="flex w-full flex-col gap-4">
          <p className="brand-p text-black">About Us</p>
          <h2 className="brand-h1 text-brand-burgundy border-brand-yellow border-l-4 pl-7 max-sm:leading-[90%]">
            Diputra <br className="sm:hidden" />
            <span className="brand-h1-semi text-brand-black"> Signature Indonesia</span>
          </h2>
          <p className="brand-p-desc text-black">
            Kami adalah tim profesional di bidang hukum, bisnis, dan imigrasi yang berkomitmen memberikan solusi yang tepat, terpercaya, dan efisien untuk klien di Indonesia. Dengan pengalaman
            bertahun-tahun, kami membantu individu dan perusahaan dalam menavigasi berbagai regulasi dan proses administratif secara aman, jelas, dan tanpa kerumitan.
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
