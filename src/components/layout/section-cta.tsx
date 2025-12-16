import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import IconLabel from '@/icons/BrandIconLabel';

export function CtaSection() {
  return (
    <section className="**:brand-stretch **:font-raleway brand-section-px bg-brand-white mx-auto mt-30 w-full max-w-[1440px]">
      <div className="bg-brand-burgundy relative flex flex-col justify-between p-5 pt-7 max-sm:gap-7 sm:flex-row sm:p-8 lg:p-10 xl:p-14">
        <IconLabel className="text-brand-yellow absolute -top-2 size-8 md:-top-4 md:size-12 lg:-top-6 lg:size-14" />
        <div className="text-brand-white flex flex-col gap-2.5">
          <h2 className="m-0 text-xl font-bold sm:text-2xl md:text-3xl lg:text-4xl">Request a Consultation</h2>
          <p className="brand-h3">Start Your Legal Process Today</p>
        </div>
        <div className="flex">
          <a href="#services-section" className="text-brand-white my-auto inline-flex items-center text-xl font-bold sm:text-2xl md:text-3xl lg:text-4xl">
            Get In Touch
            <span>
              <IconArrow className="my-auto size-8 text-white lg:size-10 xl:size-12" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
