'use client';

import IconArrow from '@/icons/BrandIconArrow';
import IconPlus from '@/icons/BrandIconPlus';
import type { ServiceItemDetail } from '@/lib/supabase/queries';
import Link from 'next/link';
import { useState } from 'react';
import { Motion } from '../motion';
import { BrandButton } from '../ui/button';

interface DetailService {
  categoryTitle: string;
  serviceTitle: string;
  serviceDescription: string;
  servicesDetail: ServiceItemDetail[];
}

export function DetailServiceSection({ categoryTitle, serviceTitle, serviceDescription, servicesDetail }: DetailService) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section
      id="service-detail"
      aria-labelledby="service-detail-title"
      className="brand-section-px brand-stretch font-raleway relative mx-auto my-auto mt-25 flex max-w-[1440px] flex-col justify-center gap-14"
    >
      <div className="mx-auto flex flex-col items-center md:w-xl lg:w-4xl">
        <div className="flex flex-col items-center gap-5">
          {/* <h2 className="brand-h3">{categoryTitle}</h2> */}
          <h1 id="service-detail-title" className="brand-h1 brand-h1-mb text-brand-maroon text-center">
            {serviceTitle}{' '}
            {/* <span className="brand-h1-semi text-black">
              <br /> {'in bali'}
            </span> */}
          </h1>
        </div>
        <p className="brand-p text-center">{serviceDescription}</p>
      </div>
      <div className="mx-auto flex flex-col items-center gap-5 md:w-xl lg:w-4xl">
        {servicesDetail.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <Motion as="article" delay={0.2} duration={0.6} y={24} x={0} once={true} key={item.title} className="flex w-full flex-col">
              <button
                type="button"
                aria-controls={`service-detail-panel-${idx}`}
                onClick={() => setOpenIndex((prev) => (prev === idx ? null : idx))}
                aria-expanded={isOpen}
                className="bg-brand-burgundy flex w-full cursor-pointer flex-row rounded-xl px-10 py-7"
              >
                <h2 className={`brand-h3 text-brand-white w-full text-left`}>{item.title}</h2>
                <IconPlus className={`my-auto size-7 transition-transform duration-200 ${isOpen ? 'text-brand-yellow rotate-45' : 'text-brand-white rotate-0'}`} />
              </button>
              <div
                id={`service-detail-panel-${idx}`}
                className={`mx-5 grid border-b-2 transition-all duration-300 ease-out ${isOpen ? 'border-brand-yellow grid-rows-[1fr]' : 'grid-rows-[0fr] border-transparent'} `}
              >
                <div className="overflow-hidden">
                  <p className="brand-p-desc mt-7 px-10">{item.description}</p>
                  <BrandButton asChild variant="ghost" className="text-brand-burgundy brand-p mt-auto mb-7 w-fit bg-transparent px-10 transition-colors duration-200">
                    <Link href="/contact">
                      {item.cta_description}
                      <span>
                        <IconArrow className="size-5 transition-colors duration-200" />
                      </span>
                    </Link>
                  </BrandButton>
                </div>
              </div>
            </Motion>
          );
        })}
      </div>
    </section>
  );
}
