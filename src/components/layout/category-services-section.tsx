import type { ServiceItem } from '@/types/dsi-services';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import { ServicesIcon } from '@/icons/service-icons';

interface CategoryServicesSectionProps {
  categorySlug: string;
  title: string;
  short_description: string;
  services: ServiceItem[];
}

export function CategoryServicesSection({ categorySlug, title, short_description, services }: CategoryServicesSectionProps) {
  return (
    <section className="brand-section-px brand-stretch font-raleway relative mx-auto my-auto mt-25 flex max-w-[1440px] flex-col justify-center gap-14">
      <div className="mx-auto flex flex-col items-center md:w-xl lg:w-4xl">
        <div className="flex flex-col items-center gap-5">
          <h2 className="brand-h1 brand-h1-mb text-brand-maroon text-center">
            {title} <span className="brand-h1-semi text-black">Services</span>
          </h2>
        </div>
        <p className="brand-p text-center">{short_description}</p>
      </div>
      <div className="*:text-brand-white grid w-full grid-cols-1 gap-x-5 overflow-hidden max-lg:rounded-2xl max-lg:*:text-black sm:grid-cols-2 md:grid-cols-2 md:gap-y-2.5 lg:grid-cols-3 lg:gap-x-2.5 xl:grid-cols-3">
        {services.map((item, idx) => {
          return (
            <div
              key={idx}
              className={`group hover:bg-brand-burgundy *:text-brand-black relative flex w-full scale-95 flex-col gap-2.5 overflow-hidden rounded-sm border border-gray-300 bg-gray-100 px-10 py-7 text-left transition-all duration-300 hover:scale-100 lg:flex-col lg:gap-7`}
            >
              <div className="bg-brand-yellow absolute -left-2 size-12 -translate-x-[110%] rotate-45 transition-all duration-500 group-hover:-translate-x-1/2" />
              <div className="*:text-brand-burgundy flex flex-col gap-4">
                <ServicesIcon name={item.icon} className="group-hover:text-brand-yellow size-12 transition-colors duration-200" />
                <h3 className="brand-h3 group-hover:text-brand-white font-semibold transition-colors duration-200">{item.title}</h3>
              </div>
              <p className="brand-p group-hover:text-brand-white font-normal transition-colors duration-200">{item.description}</p>
              <div className="mt-auto flex justify-end">
                <BrandButton asChild variant="ghost" className="brand-p group-hover:text-brand-white mt-auto w-fit bg-transparent px-5 transition-colors duration-200">
                  <a href={item.services_detail.length > 0 ? `/services/${categorySlug}/${item.slug}` : `${item.cta}`}>
                    {item.cta_description}
                    <span>
                      <IconArrow className="text-brand-black group-hover:text-brand-white size-5 transition-colors duration-200" />
                    </span>
                  </a>
                </BrandButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
