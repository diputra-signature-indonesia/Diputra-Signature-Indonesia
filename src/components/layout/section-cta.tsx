import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import IconLabel from '@/icons/BrandIconLabel';

export function CtaSection() {
  return (
    <section className="**:brand-stretch **:font-raleway brand-section-px brand-section-py bg-brand-white mx-auto max-w-[1440px]">
      <div className="bg-brand-burgundy relative flex flex-row justify-between p-14">
        <IconLabel className="text-brand-yellow absolute -top-6" />
        <div className="text-brand-white flex flex-col gap-2.5">
          <h2 className="brand-h1-semi m-0 font-bold">Request a Consultation</h2>
          <p className="brand-h3">Start Your Legal Process Today</p>
        </div>
        <div className="flex">
          <a href="#services-section" className="text-brand-white my-auto inline-flex text-2xl font-semibold sm:text-3xl lg:text-[40px]">
            Get In Touch
            <span>
              <IconArrow className="my-auto size-12 text-white" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
