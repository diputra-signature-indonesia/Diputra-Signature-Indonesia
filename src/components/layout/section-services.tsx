import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function ServicesSection() {
  const services = [
    {
      id: 0,
      title: 'Legal',
      description: 'Legal consulting for businesses and individuals in Bali, including contract and agreement drafting, document review, and ongoing compliance with Indonesian regulations.',
      image: '/image/services-legal-image.png',
    },
    {
      id: 1,
      title: 'Visa',
      description: 'End-to-end support for visas, stay permits (KITAS/KITAP), work permits, and other immigration matters for expatriates living, working, or investing in Bali.',
      image: '/image/services-visa-image.png',
    },
    {
      id: 2,
      title: 'Real Estate',
      description: 'Legal assistance for property transactions in Bali—from land and building due diligence and document verification to guiding you through purchase or lease agreements.',
      image: '/image/services-realestate-image.jpg',
    },
  ];

  return (
    <section id="services-section" className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col pt-20! lg:pt-30!">
      <div className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon">
          Diputra <span className="brand-h1-semi text-black">Services</span>
        </h2>
        <p className="brand-p-desc text-left text-balance sm:border-l sm:pl-5 lg:pl-10">
          We provide legal, visa, and real estate services tailored for individuals and businesses operating in Bali, Indonesia.{' '}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 text-white sm:gap-5 xl:h-[550px] xl:min-h-[550px] xl:flex-row">
        {services.map((item) => (
          <article key={item.id} className="relative flex w-full flex-col overflow-hidden xl:h-full">
            <Image
              src={item.image}
              alt={`${item.title} services in Bali by Diputra Signature Indonesia`}
              fill
              sizes="(min-width: 1280px) 33vw, 100vw"
              quality={75}
              className="-z-20 object-cover brightness-75"
            />
            <div className="absolute inset-0 -z-10 bg-black/40" />
            <h3 className="brand-h3 w-full p-5">{item.title}</h3>
            <div className="flex h-full flex-col gap-2.5 p-5">
              <p className="brand-p mt-auto sm:text-balance xl:text-pretty">{item.description}</p>
              <BrandButton asChild variant="ghost" className="w-full justify-end px-0 text-white">
                <a href={`/services/${item.title.toLowerCase()}`}>
                  Learn More{' '}
                  <span>
                    <IconArrow className="text-white" />
                  </span>
                </a>
              </BrandButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
