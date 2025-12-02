'use client';
import { BlogSection } from '@/components/layout/blog-section';
import { ContactSection } from '@/components/layout/contact-section';
import { ServicesSection } from '@/components/layout/services-section';
import { BrandButton } from '@/components/ui/button';
import Image from 'next/image';
import IconArrow from '@/icons/BrandIconArrow';

export default function HomePage() {
  return (
    <>
      {/* HERO SECTION */}
      <section className="**:brand-stretch **:font-raleway relative flex h-[90vh]">
        <div className="brand-section-px brand-section-py mx-auto flex max-w-[1440px] flex-col">
          <Image src={'/image/home-hero-section.jpg'} alt="home-image" fill priority={true} className="-z-10 object-cover brightness-50" />
          <div className="mx-auto mt-auto flex flex-col gap-0 max-sm:w-[90vw] md:w-2xl xl:w-full xl:flex-row xl:gap-16">
            <h1 className="brand-h1 text-brand-white w-full leading-[125%] text-balance max-xl:text-center">
              Comprehensive Legal Solutions, <span className="text-brand-yellow">Simplified.</span>
            </h1>
            <div className="mx-auto mb-5 flex w-full flex-col gap-5 sm:mb-6 lg:mb-7 xl:border-l xl:border-white xl:pl-5">
              <p className="brand-p text-brand-white max-xl:text-center">Menyederhanakan kebutuhan bisnis, legal, dan imigrasi secara profesional, transparan, dan berintegritas.</p>
              <div className="mt-auto flex gap-3 sm:gap-5">
                <BrandButton
                  onClick={() => {
                    const el = document.getElementById('contact-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="yellow"
                  className="w-full justify-center"
                >
                  Consult Now
                </BrandButton>
                <BrandButton
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="white"
                  className="w-full justify-center font-semibold"
                >
                  Our Services
                </BrandButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="**:brand-stretch **:font-raleway bg-brand-black relative flex">
        <div className="brand-section-px brand-section-py mx-auto flex w-full max-w-[1440px] flex-col gap-10 md:flex-row xl:gap-25">
          <Image
            src={'/image/about-section.png'}
            alt="about-image"
            quality={70}
            width={350}
            height={350}
            className="aspect-square h-[250px] w-full object-cover max-md:mx-auto md:h-[325px] md:w-[250px] lg:h-[375px] lg:w-[300px] xl:size-[350px]"
          />
          <div className="flex flex-col">
            <h2 className="brand-p text-white">— About Us</h2>
            <p className="brand-h1 text-brand-yellow">
              Diputra<span className="brand-h1-semi text-brand-white"> Signature Indonesia</span>
            </p>
            <p className="brand-p text-white">
              Kami adalah tim profesional di bidang hukum, bisnis, dan imigrasi yang berkomitmen memberikan solusi yang tepat, terpercaya, dan efisien untuk klien di Indonesia. Dengan pengalaman
              bertahun-tahun, kami membantu individu dan perusahaan dalam menavigasi berbagai regulasi dan proses administratif secara aman, jelas, dan tanpa kerumitan.
            </p>
            <div className="mt-7 flex w-full max-md:justify-end md:mt-auto">
              <BrandButton
                onClick={() => {
                  const el = document.getElementById('contact-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="black"
                className="w-fit"
              >
                Contact Us{' '}
                <span>
                  <IconArrow className="text-white" />
                </span>
              </BrandButton>
            </div>
          </div>
        </div>
      </section>
      <ServicesSection />
      <ContactSection />
      <BlogSection />
    </>
  );
}
