import Image from 'next/image';
import { BrandButton } from '../ui/button';
import { getServiceIcon } from '@/icons/services-icons';
import type { ServiceCategory } from '@/lib/supabase/queries';
import IconArrow from '@/icons/BrandIconArrow';
import Link from 'next/link';

interface category {
  services: ServiceCategory[];
  excludeSlug?: string;
}

export function ServicesSection({ services, excludeSlug }: category) {
  return (
    <section id="services-section" className="brand-section-px brand-stretch font-raleway relative mx-auto mt-30 flex max-w-[1440px] flex-col justify-center gap-7 xl:gap-14">
      <div className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon border-brand-yellow brand-h1-mb border-l-4 pl-7">
          DIPUTRA <span className="brand-h1-semi text-black">Services</span>
        </h2>
        <p className="brand-p text-left text-balance max-md:hidden lg:text-wrap">
          We provide legal, visa, and real estate services for individuals and businesses in Bali, Indonesia. Our services are delivered professionally with transparent procedures and clear
          communication at every stage.
        </p>
        <p className="brand-p text-left text-balance md:hidden lg:text-wrap">
          We provide legal, visa, and real estate services in Bali, Indonesia, delivered with professionalism, transparency, and clear communication.
        </p>
      </div>
      <div className="border-brand-black/10 flex flex-col gap-2.5 border-b-2 pb-14">
        <h3 className="brand-h3 text-brand-burgundy text-center font-semibold lg:text-left">Main Services</h3>
        <div className={`grid w-full grid-cols-1 gap-3 text-white sm:gap-5 md:grid-cols-2 ${excludeSlug ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          {services
            .filter((item) => item.slug !== excludeSlug && item.type === 'primary')
            .map((item, idx) => {
              const Icon = getServiceIcon(item.card_icon_key);
              return (
                <article key={item.id} className="relative z-10 flex w-full scale-95 flex-col gap-5 overflow-hidden rounded-sm p-5 transition-all duration-500 hover:scale-100 xl:gap-7">
                  <Image
                    src={item.card_image ?? '/legal.webp'}
                    alt={`${item.title} – Diputra Signature Indonesia`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    quality={75}
                    className="-z-20 object-cover brightness-75"
                  />
                  <div className="absolute inset-0 -z-10 bg-black/20" />
                  <div className="flex flex-col gap-7">
                    <div className="border-brand-yellow border-l-4 pt-5 pl-5">
                      <Icon className="size-10" />
                    </div>
                    <h4 className="brand-h3 w-full">{item.title}</h4>
                  </div>
                  <div className="mt-auto flex h-full flex-col items-end gap-7">
                    <p className="brand-p md:text-balance xl:text-pretty">{item.short_description}</p>
                    <BrandButton asChild variant="ghost" className="group mt-auto w-fit justify-end overflow-hidden px-0 pl-7 text-white">
                      <Link href={`/services/${item.slug.toLowerCase()}`} className="relative">
                        Learn More{' '}
                        <span>
                          <IconArrow className="text-white" />
                        </span>
                        <div className="border-brand-yellow absolute left-0 -z-10 aspect-square h-full -translate-x-[120%] scale-75 rotate-45 overflow-hidden rounded-full border transition-all duration-700 group-hover:translate-x-0">
                          <div className="bg-brand-yellow aspect-square w-[50px] -translate-x-full translate-y-full rotate-45 transition-transform delay-700 duration-700 group-hover:-translate-x-[40%] group-hover:translate-y-[30%]" />
                        </div>
                      </Link>
                    </BrandButton>
                  </div>
                </article>
              );
            })}
        </div>
      </div>
      <div className="border-brand-black/10 flex flex-col gap-2.5 border-b-2 pb-14">
        <h3 className="brand-h3 text-brand-burgundy text-center font-semibold lg:text-left">Additional Services</h3>
        <div className={`grid w-full grid-cols-1 gap-3 text-white sm:gap-5 md:grid-cols-2 ${excludeSlug ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
          {services
            .filter((item) => item.slug !== excludeSlug && item.type === 'secondary')
            .map((item, idx) => {
              const Icon = getServiceIcon(item.card_icon_key);
              return (
                <article key={item.id} className="relative z-10 flex w-full scale-95 flex-col gap-5 overflow-hidden rounded-sm p-5 transition-all duration-500 hover:scale-100 xl:gap-7">
                  <Image
                    src={item.card_image ?? '/legal.webp'}
                    alt={`${item.title} – Diputra Signature Indonesia `}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    quality={75}
                    className="-z-20 object-cover brightness-75"
                  />
                  <div className="absolute inset-0 -z-10 bg-black/20" />
                  <div className="flex flex-col gap-7">
                    <div className="border-brand-yellow border-l-4 pt-5 pl-5">
                      <Icon className="size-10" />
                    </div>
                    <h4 className="brand-h3 w-full">{item.title}</h4>
                  </div>
                  <div className="mt-auto flex h-full flex-col items-end gap-7">
                    <p className="brand-p md:text-balance xl:text-pretty">{item.short_description}</p>
                    <BrandButton asChild variant="ghost" className="group mt-auto w-fit justify-end overflow-hidden px-0 pl-7 text-white">
                      <Link href={`/services/${item.slug.toLowerCase()}`} className="relative">
                        Learn More{' '}
                        <span>
                          <IconArrow className="text-white" />
                        </span>
                        <div className="border-brand-yellow absolute left-0 -z-10 aspect-square h-full -translate-x-[120%] scale-75 rotate-45 overflow-hidden rounded-full border transition-all duration-700 group-hover:translate-x-0">
                          <div className="bg-brand-yellow aspect-square w-[50px] -translate-x-full translate-y-full rotate-45 transition-transform delay-700 duration-700 group-hover:-translate-x-[40%] group-hover:translate-y-[30%]" />
                        </div>
                      </Link>
                    </BrandButton>
                  </div>
                </article>
              );
            })}
        </div>
      </div>
    </section>
  );
}
