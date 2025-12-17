import Image from 'next/image';
import { BrandButton } from '../ui/button';
import { SERVICES_LIST } from '@/data/dsi-services';
import type { ServiceIconKey } from '@/data/dsi-services';
import IconArrow from '@/icons/BrandIconArrow';
import IconLawBuilding from '@/icons/BrandIconLawBuilding';
import IconVisaLaw from '@/icons/BrandIconVisaLaw';
import IconTwoBuilding from '@/icons/BrandIconTwoBuilding';

const ICONS: Record<ServiceIconKey, React.ElementType> = {
  law: IconLawBuilding,
  visa: IconVisaLaw,
  realestate: IconTwoBuilding,
};

interface category {
  heading?: string;
}

export function ServicesSection({ heading }: category) {
  return (
    <section id="services-section" className="brand-section-px brand-stretch font-raleway relative mx-auto mt-30 flex max-w-[1440px] flex-col justify-center gap-7 xl:max-h-[700px] xl:gap-14">
      <div className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon border-brand-yellow brand-h1-mb border-l-4 pl-7">
          Diputra <span className="brand-h1-semi text-black">Services</span>
        </h2>
        <p className="brand-p text-left text-balance lg:text-wrap">
          We provide legal, visa, and real estate services for individuals and businesses in Bali, Indonesia. Our services are delivered professionally with transparent procedures and clear
          communication at every stage.
        </p>
      </div>
      <div className={`grid w-full grid-cols-1 gap-3 text-white sm:gap-5 md:grid-cols-2 ${heading ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {SERVICES_LIST.filter((item) => item.title !== heading).map((item, idx) => {
          const Icon = ICONS[item.iconKey];
          return (
            <article key={item.id} className="relative z-10 flex w-full flex-col gap-5 overflow-hidden p-5 xl:gap-7">
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
              <div className="flex h-full flex-col gap-7">
                <p className="brand-p md:text-balance xl:text-pretty">{item.description}</p>
                <BrandButton asChild variant="ghost" className="mt-auto w-full justify-end px-0 text-white">
                  <a href={`/services/${item.slug.toLowerCase()}`}>
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
