'use client';
import IconQuote from '@/icons/BrandIconQuote';
import type { StoryExperience } from '@/lib/supabase/queries';
import { useState } from 'react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Mousewheel } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
interface ReviewProps {
  testimonials: StoryExperience[];
}

export function ReviewSection({ testimonials }: ReviewProps) {
  const [activeIndex, setActiveIndex] = useState(1);

  return (
    <section id="reviews-section" aria-labelledby="reviews-heading" className="brand-section-px brand-stretch font-raleway mx-auto mt-30 flex max-w-[1440px] flex-col xl:max-h-[700px]">
      <div className="mx-auto flex flex-col items-center sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 id="reviews-heading" className="brand-h1 brand-h1-mb text-brand-maroon text-center">
          Client <span className="brand-h1-semi text-black">Stories & Experience</span>
        </h2>
        <p className="brand-p-desc text-center text-balance max-sm:hidden">
          We are committed to delivering trusted legal, business, and immigration services through experienced professionals, transparent processes, and solutions tailored to each client’s needs.
        </p>
        <p className="brand-p-desc text-center text-balance sm:hidden">We provide trusted legal, business, and immigration services with transparent processes and tailored solutions.</p>
      </div>

      <Swiper
        modules={[Mousewheel]}
        centeredSlides
        initialSlide={1}
        grabCursor
        touchStartPreventDefault={false}
        mousewheel={{ forceToAxis: true, releaseOnEdges: true }}
        slidesPerView={'auto'}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        className="h-64! w-full! pb-7! sm:h-72! lg:h-80!"
      >
        {testimonials.map((item, index) => {
          const isActive = index === activeIndex;
          const cardBase = 'flex! size-64! h-full! flex-col! overflow-hidden! border! !border-black/10  w-xs! md:w-md! lg:w-xl! transition-all! duration-300!';
          const cardState = isActive ? 'scale-100! text-brand-black! shadow-md!' : 'scale-75! text-brand-black!';
          return (
            <SwiperSlide key={item.id} className={`${cardBase} ${cardState} mx-auto rounded-xl p-5`}>
              <IconQuote className="text-brand-yellow mb-5 size-6" />
              <figure className="flex h-full flex-col overflow-hidden">
                <blockquote className="brand-p scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand-burgundy/20 hover:scrollbar-thumb-brand-burgundy/40 flex-1 overflow-y-auto pr-1">
                  “{item.message}”
                </blockquote>
                <figcaption className="flex shrink-0 flex-col pt-5 pr-10">
                  <h3 className="brand-p text-brand-burgundy truncate font-semibold">{item.name}</h3>
                  <time dateTime={item.created_at ?? ''} className="brand-p flex items-center text-[9px] sm:text-xs lg:text-sm">
                    {item.created_at}
                  </time>
                </figcaption>
              </figure>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
