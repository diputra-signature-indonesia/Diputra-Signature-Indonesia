'use client';

import { useState } from 'react';
import { ServiceDetail } from '@/types/dsi-services';
import { BrandButton } from '../ui/button';
import IconPlus from '@/icons/BrandIconPlus';
import IconArrow from '@/icons/BrandIconArrow';

interface DetailService {
  categoryTitle: string;
  serviceTitle: string;
  serviceDescription: string;
  servicesDetail: ServiceDetail[];
}

export function DetailServiceSection({ categoryTitle, serviceTitle, serviceDescription, servicesDetail }: DetailService) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section className="brand-section-px brand-stretch font-raleway relative mx-auto my-auto mt-25 flex max-w-[1440px] flex-col justify-center gap-14">
      <div className="mx-auto flex flex-col items-center md:w-xl lg:w-4xl">
        <div className="flex flex-col items-center gap-5">
          <h2 className="brand-h1 brand-h1-mb text-brand-maroon">
            {categoryTitle} <span className="brand-h1-semi text-black">— {serviceTitle}</span>
          </h2>
        </div>
        <p className="brand-p text-center">{serviceDescription}</p>
      </div>
      <div className="mx-auto flex flex-col items-center gap-5 md:w-xl lg:w-4xl">
        {servicesDetail.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={item.detail_title} className="flex w-full flex-col">
              <button
                type="button"
                onClick={() => setOpenIndex((prev) => (prev === idx ? null : idx))}
                aria-expanded={isOpen}
                className="bg-brand-burgundy flex w-full cursor-pointer flex-row px-10 py-7"
              >
                <h3 className={`brand-h3 text-brand-white w-full text-left`}>{item.detail_title}</h3>
                <IconPlus className={`my-auto size-7 transition-transform duration-200 ${isOpen ? 'text-brand-yellow rotate-45' : 'text-brand-white rotate-0'}`} />
              </button>
              <div className={`grid border-b-2 transition-all duration-300 ease-out ${isOpen ? 'border-brand-yellow grid-rows-[1fr]' : 'grid-rows-[0fr] border-transparent'} `}>
                <div className="overflow-hidden">
                  <p className="brand-p-desc mt-7 px-10">{item.detail_description}</p>
                  <BrandButton asChild variant="ghost" className="text-brand-burgundy brand-p mt-auto mb-7 w-fit bg-transparent px-10 transition-colors duration-200">
                    <a href="/contact">
                      {item.detail_cta_description}
                      <span>
                        <IconArrow className="size-5 transition-colors duration-200" />
                      </span>
                    </a>
                  </BrandButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
