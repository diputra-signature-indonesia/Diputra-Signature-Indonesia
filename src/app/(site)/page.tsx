'use client';
import { BlogSection } from '@/components/layout/blog-section';
import { ContactSection } from '@/components/layout/contact-section';
import { ServicesSection } from '@/components/layout/services-section';
import { BrandButton } from '@/components/ui/button';
import IconTime from '@/icons/BrandIconTime';
import Image from 'next/image';
import IconArrow from '@/icons/BrandIconArrow';

export default function HomePage() {
  const advantageContent = [
    {
      title: 'Experienced',
      subTitle: 'Legal Experts',
      description: 'Tim profesional dengan pengalaman mendalam dalam menangani urusan legal, bisnis, dan imigrasi di Indonesia.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
    {
      title: 'English–Indonesian',
      subTitle: 'Support',
      description: 'Komunikasi jelas dan efektif untuk klien lokal maupun internasional, memastikan proses berjalan tanpa hambatan.',
      styleContent: 'lg:rounded-tl-2xl lg:rounded-br-2xl',
    },
    {
      title: 'Personalized',
      subTitle: 'Solutions',
      description: 'Setiap layanan disesuaikan dengan kebutuhan klien, memberikan solusi yang tepat, efisien, dan berorientasi hasil.',
      styleContent: 'lg:rounded-tl-2xl lg:rounded-br-2xl',
    },
    {
      title: 'Fast & Transparent',
      subTitle: 'Process',
      description: 'Proses cepat dengan informasi yang jelas di setiap tahap, memastikan klien selalu mengetahui perkembangan layanan.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
  ];

  return (
    <>
      {/* HERO SECTION */}
      <section className="**:brand-stretch **:font-raleway relative flex h-[90vh]">
        <div className="brand-section-px brand-section-py mx-auto flex max-w-[1440px] flex-col">
          <Image src={'/image/home-hero-section.jpg'} alt="home-image" fill priority={true} className="-z-10 object-cover brightness-50" />
          <div className="mx-auto mt-auto flex flex-col gap-0 max-sm:w-full md:w-2xl xl:w-full xl:flex-row xl:gap-16">
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
                  className="w-full justify-center max-sm:px-0"
                >
                  Consult Now
                </BrandButton>
                <BrandButton
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="white"
                  className="w-full justify-center font-semibold max-sm:px-0"
                >
                  Our Services
                </BrandButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="**:brand-stretch **:font-raleway sm:bg-brand-black relative flex">
        <div className="brand-section-px brand-section-py relative mx-auto flex w-full max-w-[1440px] flex-col gap-10 sm:flex-row xl:gap-25">
          <Image
            src={'/image/about-section.png'}
            alt="about-image"
            quality={70}
            width={350}
            height={350}
            className="aspect-square size-full object-cover max-sm:absolute max-sm:top-0 max-sm:right-0 max-sm:-z-10 max-sm:brightness-50 sm:w-[200px] md:h-[325px] md:w-[250px] lg:h-[375px] lg:w-[300px] xl:size-[350px]"
          />
          <div className="flex flex-col gap-4">
            <h2 className="brand-p text-white">About Us</h2>
            <p className="brand-h1 text-brand-yellow max-sm:leading-[90%]">
              Diputra <br className="sm:hidden" />
              <span className="brand-h1-semi text-brand-white"> Signature Indonesia</span>
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
                Contact Us
                <span>
                  <IconArrow className="size-5 text-white" />
                </span>
              </BrandButton>
            </div>
          </div>
        </div>
      </section>

      <ServicesSection />

      {/* Advantage Section */}
      <section className="brand-section-px brand-section-py **:brand-stretch **:font-raleway relative mx-auto flex max-w-[1440px] flex-col pt-20 lg:pt-30">
        <div className="mx-auto flex flex-col items-center sm:w-xl lg:w-2xl xl:w-3xl">
          <p className="brand-h1 text-brand-maroon">
            Diputra <span className="brand-h1-semi text-black">Services</span>
          </p>
          <h2 className="brand-p text-brand-black mb-7">Why Choose Us?</h2>
          <p className="brand-p-desc text-center text-balance">
            Kami berkomitmen memberikan layanan legal, bisnis, dan imigrasi yang terpercaya melalui tenaga ahli berpengalaman, proses yang transparan, serta solusi yang disesuaikan dengan kebutuhan
            setiap klien.
          </p>
        </div>
        <div className="lg:*:bg-brand-burgundy *:text-brand-white grid w-full grid-cols-1 overflow-hidden max-lg:rounded-2xl max-lg:*:text-black lg:grid-cols-2 lg:gap-5">
          {advantageContent.map((item, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === advantageContent.length - 1;
            return (
              <div
                key={idx}
                className={`flex w-full flex-col gap-2.5 px-5 pt-5 text-left lg:flex-col lg:gap-5 lg:px-10 lg:*:text-center ${item.styleContent} ${isFirst ? 'max-lg:pt-10' : ''} ${isLast ? 'max-lg:pb-5' : ''}`}
              >
                <h3 className="brand-h3 max-lg:text-brand-burgundy font-semibold text-balance">
                  {item.title} <span className="max-lg:text-brand-black font-light">{item.subTitle}</span>
                </h3>
                <p className={`brand-p ${isLast ? 'border-none' : 'border-brand-gray border-b lg:border-none'} pb-5`}>{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col pt-20 lg:pt-30">
        <div className="mx-auto flex flex-col items-center sm:w-xl lg:w-2xl xl:w-3xl">
          <h2 className="brand-h1 text-brand-maroon text-center">
            Client <span className="brand-h1-semi text-black">Stories & Experience</span>
          </h2>
          <p className="brand-p-desc text-center text-balance">
            Kami berkomitmen memberikan layanan legal, bisnis, dan imigrasi yang terpercaya melalui tenaga ahli berpengalaman, proses yang transparan, serta solusi yang disesuaikan dengan kebutuhan
            setiap klien.
          </p>
        </div>
        <div className="h-64 w-full sm:h-72 lg:h-80">
          <div className="flex h-full w-64 flex-col gap-5 border bg-white p-5 sm:w-xs lg:w-sm">
            <div className="h-full overflow-y-scroll">
              <p className="brand-p">
                DSI sangat membantu dalam proses pengurusan izin kerja dan KITAS saya. Penjelasan selalu diberikan dengan jelas, dan setiap tahap diinformasikan tanpa perlu saya mengejar. Saya merasa
                aman dan terbantu sepanjang proses. Layanan mereka benar-benar profesional.
              </p>
            </div>
            <hr className="opacity-25" />
            <div className="flex flex-col gap-2.5">
              <h3 className="brand-h3 text-brand-maroon font-semibold">Laksmi Lestari</h3>
              <p className="brand-p flex items-center">
                27-11-2025
                <span className="ml-2.5">
                  <IconTime className="my-auto size-5" />
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <ContactSection />
      <BlogSection />
    </>
  );
}
