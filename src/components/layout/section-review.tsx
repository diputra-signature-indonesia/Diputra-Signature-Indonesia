'use client';
import 'swiper/css';
import 'swiper/css/pagination';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { useState } from 'react';

export function ReviewSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const testimonials = [
    {
      id: 1,
      name: 'Laksmi Lestari',
      date: '27-11-2025',
      message:
        'DSI guided me through my work permit and KITAS application in Bali. Every step was clearly explained, and I always knew what was happening. I felt safe and well taken care of throughout the process.',
    },
    {
      id: 2,
      name: 'Michael Anderson',
      date: '03-02-2026',
      message: 'Professional, responsive, and very familiar with Bali’s regulations. They handled my company’s legal documents efficiently and kept communication clear from start to finish.',
    },
    {
      id: 3,
      name: 'Ayumi Tanaka',
      date: '15-04-2026',
      message: 'As a foreigner investing in Bali, I needed someone I could trust. DSI helped with both my visa and property due diligence. Their team made a complex process feel straightforward.',
    },
  ];

  return (
    <section className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col">
      <div className="mx-auto flex flex-col items-center sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon text-center">
          Client <span className="brand-h1-semi text-black">Stories & Experience</span>
        </h2>
        <p className="brand-p-desc text-center text-balance">
          Kami berkomitmen memberikan layanan legal, bisnis, dan imigrasi yang terpercaya melalui tenaga ahli berpengalaman, proses yang transparan, serta solusi yang disesuaikan dengan kebutuhan
          setiap klien.
        </p>
      </div>

      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        centeredSlides
        slidesPerView={'auto'}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        className="flex! h-64! w-full! flex-row! sm:h-72! lg:h-80!"
      >
        {testimonials.map((item, index) => {
          const isActive = index === activeIndex;
          const cardBase = 'bg-brand-burgundy! flex! size-64! h-full! flex-col! overflow-hidden! rounded-2xl! sm:w-xs! lg:w-sm! transition-all! duration-300!';
          const cardState = isActive ? 'bg-brand-burgundy! scale-100! text-brand-white! shadow-xl!' : 'bg-gray-200! scale-75! text-brand-black!';
          return (
            <SwiperSlide key={item.id} className={`${cardBase} ${cardState} mx-auto p-5`}>
              <div className="hide-scrollbar h-full overflow-y-scroll">
                <p className="brand-p">{item.message}</p>
              </div>
              <div className="flex flex-col rounded-b-2xl py-5">
                <h3 className="brand-h3 font-semibold">{item.name}</h3>
                <p className="brand-p flex items-center text-[9px] sm:text-xs lg:text-sm">{item.date}</p>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
