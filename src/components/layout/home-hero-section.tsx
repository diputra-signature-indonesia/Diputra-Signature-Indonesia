import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Motion } from '../motion';

const serviceHighlights = ['Company Setup', 'Visa & Immigration', 'Property Advisory'];

export function HeroSection() {
  return (
    <section aria-label="Hero" id="hero-section" className="bg-brand-white font-raleway relative isolate overflow-hidden">
      <div className="brand-section-px mx-auto grid min-h-[calc(100svh-5.5rem)] max-w-[1440px] items-center gap-14 py-14 md:py-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)] lg:gap-16 lg:py-20 xl:gap-24">
        <div className="relative z-10 flex max-w-[680px] flex-col items-start">
          <Motion as="div" delay={0.1} duration={0.55} y={18} x={0} once className="w-full">
            <p className="mb-5 inline-flex rounded-full border border-[#800020]/15 bg-[#f7edef] px-3 py-1 text-[10px] leading-4 font-bold tracking-[0.2em] text-[#800020] uppercase sm:text-[11px]">
              Legal&nbsp; • &nbsp;Business&nbsp; • &nbsp;Immigration
            </p>
          </Motion>

          <Motion as="div" delay={0.2} duration={0.6} y={22} x={0} once className="w-full">
            <div className="relative">
              <span aria-hidden="true" className="absolute -top-2 -left-3 -z-10 size-8 -rotate-3 rounded-sm bg-[#ffc30b]/35" />
              <h1 className="text-brand-black max-w-[650px] text-[2.55rem] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance sm:text-5xl sm:leading-[1.02] lg:text-[3.4rem] xl:text-[4rem]">
                Comprehensive Legal Solutions,{' '}
                <span className="relative inline-block text-[#800020]">
                  Simplified.
                  <span aria-hidden="true" className="absolute right-0 -bottom-2 left-0 h-[5px] -rotate-1 rounded-full bg-[#ffc30b] sm:h-1.5" />
                </span>
              </h1>
            </div>
          </Motion>

          <Motion as="div" delay={0.3} duration={0.6} y={22} x={0} once className="w-full">
            <p className="mt-8 max-w-[610px] text-sm leading-6 font-normal tracking-normal text-[#595959] sm:text-base sm:leading-7 lg:text-[17px]">
              Professional legal, business, and immigration support—transparent, reliable, and tailored for individuals and companies in Bali.
            </p>
          </Motion>

          <Motion as="div" delay={0.4} duration={0.6} y={22} x={0} once className="mt-8 flex w-full flex-col gap-3 min-[420px]:w-auto min-[420px]:flex-row">
            <Link
              href="/contact"
              className="focus-visible:ring-brand-burgundy inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#800020] bg-[#800020] px-7 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_6px_18px_rgba(128,0,32,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#6f001c] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Consult Now
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </Link>
            <Link
              href="/services"
              className="focus-visible:ring-brand-burgundy inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#0d0d0d]/20 bg-white px-6 text-sm font-semibold tracking-normal text-[#0d0d0d] transition duration-200 hover:-translate-y-0.5 hover:border-[#800020]/35 hover:text-[#800020] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Explore Our Services
              <ArrowRight aria-hidden="true" className="size-4 text-[#800020]" strokeWidth={1.8} />
            </Link>
          </Motion>

          <Motion as="div" delay={0.5} duration={0.6} y={22} x={0} once className="mt-9 w-full border-t border-[#eae6e5] pt-5 sm:mt-10 sm:pt-6">
            <p className="flex items-center gap-2 text-xs leading-5 font-semibold tracking-normal text-[#272727]">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#ffc30b] shadow-[0_0_0_4px_rgba(255,195,11,0.12)]" />
              Supporting individuals, investors, and businesses in Bali
            </p>
            <ul aria-label="Key service areas" className="mt-4 flex flex-wrap gap-2">
              {serviceHighlights.map((service) => (
                <li
                  key={service}
                  className="flex items-center gap-2 rounded-full border border-[#eae6e5] bg-white px-3.5 py-1.5 text-[11px] leading-4 font-medium tracking-normal text-[#303030] shadow-[0_2px_8px_rgba(13,13,13,0.025)] sm:text-xs"
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-[#800020]/60" />
                  {service}
                </li>
              ))}
            </ul>
          </Motion>
        </div>

        <Motion as="div" delay={0.3} duration={0.7} y={24} x={0} once className="w-full">
          <div className="relative mx-auto w-full max-w-[560px] px-5 pt-5 pb-14 sm:px-10 sm:pt-8 sm:pb-20 lg:px-0 lg:pt-6 lg:pb-16">
            <span aria-hidden="true" className="absolute top-0 right-0 -z-10 h-[46%] w-[42%] rotate-3 rounded-2xl bg-[#ffc30b]/14" />
            <span aria-hidden="true" className="absolute bottom-[14%] left-0 -z-10 size-40 -rotate-3 rounded-3xl bg-[#800020]/6 sm:size-52" />
            <span aria-hidden="true" className="absolute top-[45%] -right-3 -z-10 h-24 w-12 rounded-r-xl border-y-2 border-r-2 border-[#ffc30b]/45" />

            <div className="relative ml-auto aspect-[4/3] w-[92%] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_55px_-22px_rgba(13,13,13,0.28)]">
              <Image
                src="/image/home-hero-consultation-v2.jpg"
                alt="Professional team reviewing business documents during a consultation"
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 1023px) 90vw, 520px"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 flex w-fit max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-md border border-white/20 bg-black/35 px-2.5 py-1.5 text-[10px] leading-4 font-medium tracking-normal text-white/95 backdrop-blur-md sm:text-xs">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-[#ffc30b]" strokeWidth={2} />
                Bali-based Legal &amp; Business Advisory
              </div>
            </div>

            <div className="absolute bottom-0 left-0 aspect-square w-[42%] max-w-[215px] overflow-hidden rounded-xl border-4 border-white bg-white shadow-[0_18px_35px_-16px_rgba(13,13,13,0.35)] sm:left-2">
              <Image src="/image/home-hero-documents.jpg" alt="Professionals reviewing documents together" fill sizes="(max-width: 640px) 40vw, 215px" className="object-cover" />
            </div>

            <div className="absolute right-0 bottom-4 flex max-w-[235px] items-center gap-3 rounded-xl border border-[#eae6e5] bg-white/95 p-3.5 shadow-[0_16px_34px_-12px_rgba(128,0,32,0.2)] backdrop-blur-md sm:right-1 sm:bottom-9 sm:p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#800020]/15 bg-[#f7edef] text-[#800020]">
                <ShieldCheck aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </span>
              <span className="flex flex-col tracking-normal">
                <span className="text-[11px] leading-4 font-bold text-[#0d0d0d] sm:text-xs">End-to-End Assistance</span>
                <span className="mt-0.5 text-[10px] leading-[1.3] font-medium text-[#666] sm:text-[11px]">From consultation to completion</span>
              </span>
            </div>
          </div>
        </Motion>
      </div>
    </section>
  );
}
