'use client';
import 'swiper/css';
import 'swiper/css/pagination';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { useState } from 'react';
import IconQuote from '@/icons/BrandIconQuote';
import type { StoryExperience } from '@/lib/supabase/queries';
interface ReviewProps {
  testimonials: StoryExperience[];
}

export function ReviewSection({ testimonials }: ReviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

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
        modules={[Pagination]}
        pagination={{ clickable: true }}
        centeredSlides
        slidesPerView={'auto'}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        className="flex! h-64! w-full! flex-row! pb-7! sm:h-72! lg:h-80!"
      >
        {testimonials.map((item, index) => {
          const isActive = index === activeIndex;
          const cardBase = 'flex! size-64! h-full! flex-col! overflow-hidden!  sm:w-xs! lg:w-sm! transition-all! duration-300!';
          const cardState = isActive ? 'border-t-4 border-brand-yellow scale-100! text-brand-black! shadow-xl!' : 'border-t-4 border-brand-burgundy bg-gray-100! scale-75! text-brand-black!';
          return (
            <SwiperSlide key={item.id} className={`${cardBase} ${cardState} mx-auto p-5`}>
              <IconQuote className="text-brand-yellow size-6" />
              <figure className="hide-scrollbar h-full overflow-y-scroll">
                <blockquote className="brand-p">“{item.message}”</blockquote>
                <figcaption className="flex flex-col py-5">
                  <h3 className="brand-h3 text-brand-burgundy font-semibold">{item.name}</h3>
                  <time dateTime={item.experience_date ?? ''} className="brand-p flex items-center text-[9px] sm:text-xs lg:text-sm">
                    {item.experience_date}
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
