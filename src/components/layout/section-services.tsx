import IconArrow from '@/icons/BrandIconArrow';
import { getServiceIcon } from '@/icons/services-icons';
import type { ServiceCategory } from '@/lib/supabase/queries';
import Image from 'next/image';
import Link from 'next/link';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

interface category {
  services: ServiceCategory[];
  excludeSlug?: string;
}

export function ServicesSection({ services, excludeSlug }: category) {
  return (
    <section id="services-section" className="brand-section-px brand-stretch font-raleway relative mx-auto mt-30 flex max-w-[1440px] flex-col justify-center gap-7 overflow-x-hidden xl:gap-7">
      <Motion as="div" delay={0.2} duration={0.6} y={0} x={-100} once={true} className="flex flex-col gap-5 sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon border-brand-yellow border-l-4 pl-7">
          Diputra <span className="brand-h1-semi text-black">Services</span>
        </h2>
        <p className="brand-p text-left lg:text-wrap">Trusted legal, visa, and real estate services in Bali for individuals and businesses.</p>
      </Motion>

      <div className="border-brand-black/10 flex flex-col gap-2.5 pb-14">
        <div className={`grid w-full grid-cols-1 gap-3 text-white md:grid-cols-2 xl:gap-12 ${excludeSlug ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          {services
            .filter((item) => item.slug !== excludeSlug && item.type === 'primary')
            .map((item, idx) => {
              const Icon = getServiceIcon(item.card_icon_key);
              return (
                <Motion
                  key={item.id}
                  as="article"
                  delay={0.2 + idx * 0.1}
                  duration={0.6}
                  y={0}
                  x={-20}
                  once={true}
                  className="inner-shadow group shadow-brand-burgundy/20 relative z-10 flex w-full flex-col overflow-hidden rounded-xl p-7 pt-36 shadow-md transition-shadow duration-500 hover:shadow-xl"
                >
                  {/* item.card_image ?? '/legal.webp' */}
                  <div className="flex flex-col gap-5 overflow-hidden">
                    <Image
                      src={item.card_image ?? '/legal.webp'}
                      alt={`${item.title} – Diputra Signature Indonesia`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      quality={75}
                      className="-z-20 scale-110 object-cover brightness-90 transition-transform delay-0 duration-500 group-hover:scale-100"
                    />
                    <div className="absolute inset-0 -z-20 bg-linear-to-t from-black/90 via-black/60 to-transparent"></div>
                    <div className="flex flex-col gap-5">
                      <div className="bg-brand-black/15 border-brand-white/25 w-fit rounded-md border p-2.5">
                        <Icon className="size-10" />
                      </div>
                      <h4 className="brand-h2 w-full font-bold">{item.title}</h4>
                    </div>
                    <div className="mt-auto flex h-full flex-col items-end gap-5">
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
                      <div className="bg-brand-yellow absolute bottom-0 left-0 h-1 w-full" />
                    </div>
                  </div>
                </Motion>
              );
            })}
        </div>
      </div>
      <div className="border-brand-black/10 flex flex-col gap-5 pb-14">
        <Motion as="div" delay={0.2} duration={0.6} y={0} x={-100} once={true} className="flex flex-col gap-5 sm:w-xl lg:w-2xl xl:w-3xl">
          <h2 className="brand-h1 text-brand-maroon border-brand-yellow border-l-4 pl-7">
            Additional <span className="brand-h1-semi text-black">Services</span>
          </h2>
        </Motion>
        <p className="brand-p text-left lg:text-wrap">Additional professional services provided to complement our core legal and consulting offerings.</p>
        <div className={`grid w-full grid-cols-1 gap-3 text-white sm:gap-5 md:grid-cols-2 xl:gap-12 ${excludeSlug ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
          {services
            .filter((item) => item.slug !== excludeSlug && item.type === 'secondary')
            .map((item, idx) => {
              const Icon = getServiceIcon(item.card_icon_key);
              const servicesLength = services.filter((item) => item.type === 'secondary').length;
              return (
                <Motion
                  as="article"
                  delay={0.2 + idx * 0.1}
                  duration={0.6}
                  y={0}
                  x={-20}
                  once={true}
                  key={item.id}
                  className={`inner-shadow group relative z-10 flex w-full flex-col overflow-hidden rounded-xl p-5 pt-36 ${servicesLength === 2 ? 'pt-8' : 'pt-36'} shadow-brand-burgundy/20 shadow-md transition-shadow duration-500 hover:shadow-xl`}
                >
                  <div className="flex flex-col gap-5">
                    <Image
                      src={item.card_image ?? '/legal.webp'}
                      alt={`${item.title} – Diputra Signature Indonesia `}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      quality={75}
                      className="-z-20 scale-110 object-cover brightness-90 transition-transform delay-0 duration-500 group-hover:scale-100"
                    />
                    <div className="absolute inset-0 -z-20 bg-linear-to-t from-black/90 via-black/60 to-transparent"></div>
                    <div className="flex flex-col gap-5">
                      <div className="bg-brand-black/15 border-brand-white/25 w-fit rounded-md border p-2.5">
                        <Icon className="size-10" />
                      </div>
                      <h4 className="brand-h2 w-full font-bold">{item.title}</h4>
                    </div>
                    <div className="mt-auto flex h-full flex-col items-end gap-5">
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
                  </div>
                  <div className="bg-brand-yellow absolute bottom-0 left-0 h-1 w-full" />
                </Motion>
              );
            })}
        </div>
      </div>
    </section>
  );
}
