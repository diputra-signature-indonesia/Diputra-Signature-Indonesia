'use client';
import { useState } from 'react';
import IconAnswer from '@/icons/BrandIconAnswer';
import { DSI_QNA } from '@/data/dsi-qna';

export function QnaSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section className="brand-section-px brand-stretch font-raleway relative mx-auto my-auto mt-25 flex max-w-[1440px] flex-col justify-center gap-14">
      <div className="mx-auto flex flex-col items-center md:w-xl lg:w-4xl">
        <div className="flex flex-col items-center gap-5">
          <h2 className="brand-h1 brand-h1-mb text-brand-maroon">
            Frequently <span className="brand-h1-semi text-black">Ask</span>
          </h2>
        </div>
        <p className="brand-p text-center max-sm:hidden">
          We are committed to delivering trustworthy legal, visa, and real estate services through experienced professionals, transparent processes, and solutions tailored to each client in Bali,
          Indonesia.
        </p>
        <p className="brand-p text-center sm:hidden">
          We deliver trustworthy legal, visa, and real estate services in Bali through experienced professionals and transparent, client-focused solutions.
        </p>
      </div>
      <div className="h-[450px] w-full overflow-y-scroll">
        {DSI_QNA.map((item, idx) => {
          const isOpen = openIndex === idx;

          return (
            <article key={idx} className={`border-b transition-all duration-300 ${isOpen ? 'bg-brand-burgundy hover:bg-brand-burgundy px-5' : 'px-2.5 hover:bg-gray-200'}`}>
              <button type="button" className="flex w-full cursor-pointer flex-col py-5 text-left" onClick={() => setOpenIndex((prev) => (prev === idx ? null : idx))} aria-expanded={isOpen}>
                <div className="flex w-full justify-between">
                  <h3 className={`brand-p w-full ${isOpen && 'text-brand-white'}`}>{item.question}</h3>
                  <IconAnswer className={`mx-5 size-5 shrink-0 transition-transform duration-300 ${isOpen ? 'text-brand-yellow rotate-360' : ''}`} />
                </div>
                <div className={`grid w-full transition-[grid-template-rows] duration-400 ease-out lg:w-[640px] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className={`brand-p mt-5 ${isOpen && 'text-brand-white border-brand-yellow border-l-4 pl-2.5'}`}>{item.answer}</p>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
