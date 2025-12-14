import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import IconLawBuilding from '@/icons/BrandIconLawBuilding';
import IconVisaLaw from '@/icons/BrandIconVisaLaw';
import IconTwoBuilding from '@/icons/BrandIconTwoBuilding';
export function ServicesSection() {
  const services = [
    {
      id: 0,
      title: 'Legal',
      description: 'Legal consulting for businesses and individuals in Bali, including contract and agreement drafting, document review, and ongoing compliance with Indonesian regulations.',
      image: '/image/services-legal-image.png',
      icon: IconLawBuilding,
    },
    {
      id: 1,
      title: 'Visa',
      description: 'End-to-end support for visas, stay permits (KITAS/KITAP), work permits, and other immigration matters for expatriates living, working, or investing in Bali.',
      image: '/image/services-visa-image.png',
      icon: IconVisaLaw,
    },
    {
      id: 2,
      title: 'Real Estate',
      description: 'Legal assistance for property transactions in Bali—from land and building due diligence and document verification to guiding you through purchase or lease agreements.',
      image: '/image/services-realestate-image.jpg',
      icon: IconTwoBuilding,
    },
  ];

  return (
    <section id="services-section" className="brand-section-px brand-section-py **:brand-stretch **:font-raleway relative mx-auto flex max-w-[1440px] flex-col pt-20! lg:pt-30!">
      <div className="via-brand-white to-brand-white pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-white/0" />

      <div className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon border-brand-yellow brand-h1-mb border-l-4 pl-7">
          Diputra <span className="brand-h1-semi text-black">Services</span>
        </h2>
        <p className="brand-p-desc text-left text-balance lg:text-wrap">
          We provide legal, visa, and real estate services for individuals and businesses in Bali, Indonesia. Our services are delivered professionally with transparent procedures and clear
          communication at every stage.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 gap-3 text-white sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.id} className="relative z-10 flex w-full flex-col gap-7 overflow-hidden p-5 md:py-10 lg:py-13">
              <Image
                src={item.image}
                alt={`${item.title} services in Bali by Diputra Signature Indonesia`}
                fill
                sizes="(min-width: 1280px) 33vw, 100vw"
                quality={75}
                className="-z-20 object-cover brightness-75"
              />
              <div className="absolute inset-0 -z-10 bg-black/20" />
              <div className="flex flex-col gap-7">
                <div className="border-brand-yellow border-l-4 pt-5 pl-5">
                  <Icon className="size-10" />
                </div>
                <h3 className="brand-h3 w-full">{item.title}</h3>
              </div>
              <div className="flex h-full flex-col gap-14">
                <p className="brand-p md:text-balance xl:text-pretty">{item.description}</p>
                <BrandButton asChild variant="ghost" className="mt-auto w-full justify-end px-0 text-white">
                  <a href={`/services/${item.title.toLowerCase()}`}>
                    Learn More{' '}
                    <span>
                      <IconArrow className="text-white" />
                    </span>
                  </a>
                </BrandButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
