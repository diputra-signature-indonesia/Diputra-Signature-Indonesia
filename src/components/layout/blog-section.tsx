"use client"

import Image from "next/image"
import IconArrow from "@/icons/BrandIconArrow"
import { BrandButton } from "../ui/button"
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from 'swiper/modules';
import "swiper/css";
import 'swiper/css/free-mode';

export function BlogSection(){
    

    const item = [
        {
            id: 1,
            title: "News"
        },
        {
            id: 2,
            title: "News"
        },
        {
            id: 3,
            title: "News"
        },
        {
            id: 4,
            title: "News"
        },
        {
            id: 5,
            title: "News"
        },
        {
            id: 6,
            title: "News"
        },
    ]

    return(
        <section className="flex flex-col gap-7 brand-section-px brand-section-py **:brand-stretch **:font-raleway">
            <div className="flex flex-col w-full items-end gap-14">
                <div className="flex flex-col gap-7 items-end w-3/4 lg:w-1/2">
                    <h2 className="brand-h1-semi font-light">Latest <span className="brand-h1 font-semibold text-brand-maroon">News</span></h2>
                    <p className="brand-p text-right text-balance">Dapatkan update terbaru seputar legalitas, peraturan pemerintah, imigrasi, dan bisnis di Indonesia.</p>
                </div>
                <div className="flex items-end gap-2.5">
                    <div className="flex rounded-xl border ">
                        <BrandButton variant="ghost" className="px-5 py-2 text-base font-light">Dec<span><IconArrow className="text-black rotate-90"/></span></BrandButton>
                        <div className="w-px h-10 bg-black"></div>
                        <BrandButton variant="ghost" className="px-5 py-2 text-base font-light">2025<span><IconArrow className="text-black rotate-90"/></span></BrandButton>
                    </div>
                    <BrandButton variant="white" className="px-5 py-2 text-base font-light">Find</BrandButton>
                </div>
            </div>
            <Swiper
                className="mySwiper w-full! lg:h-auto! h-[60vh]!"
                modules={[FreeMode]}
                slidesPerView={'auto'}
                freeMode={true}
                spaceBetween={30}
                direction="vertical" // default: mobile & lg+
                breakpoints={{
                    // sm ≥ 640px → VERTICAL
                    640: {
                    direction: "vertical",
                    slidesPerView: 'auto',
                    spaceBetween: 24,
                    },
                    // lg ≥ 1024px → balik HORIZONTAL
                    1024: {
                    direction: "horizontal",
                    slidesPerView: 'auto',
                    spaceBetween: 30,
                    },
                }}>
                {item.map((item)=>(
                    <SwiperSlide key={item.id} className="w-fit! h-fit!">
                        <div className="flex flex-row w-full lg:w-[350px] h-fit gap-5">
                            <div className="flex flex-col w-fit brand-h3 max-sm:hidden">
                                <p className="pb-2.5 border-b">01</p>
                                <p className="py-2.5 border-b">12</p>
                                <p className="pt-2.5">20 25</p>
                            </div>
                            <div className="flex max-sm:flex-row lg:flex-col border border-brand-black-semi">
                                <Image alt="blog-1" src={'/image/news_image.png'} width={300} height={200} className="max-sm:size-25 sm:w-2/5 lg:w-full lg:h-[200px] object-cover"/>
                                <div className="flex flex-col w-full p-2 lg:p-5 gap-1 sm:gap-2.5">
                                    <h3 className="text-balance brand-h3 font-light line-clamp-2 sm:line-clamp-2 ">Perubahan Regulasi KITAS 2025 Perubahan Regulasi KITAS 2025 Perubahan Regulasi KITAS 2025</h3>
                                    <p className="max-sm:text-[10px] sm:text-xs lg:text-sm font-light line-clamp-2 sm:line-clamp-5">
                                        Ringkasan berita singkat yang relevan dengan dunia hukum, 
                                        imigrasi, atau bisnis. Konten ini membantu klien tetap mendapatkan 
                                        informasi terkini tentang kebijakan dan regulasi terbaru.
                                    </p>
                                    <div className="mt-auto flex justify-end max-sm:hidden lg:hidden ">
                                        <BrandButton variant="ghost" className="px-2.5 py-2 text-sm font-light">Learn More<span><IconArrow className="text-black"/></span></BrandButton>
                                    </div>
                                </div>
                                <div className="flex justify-end max-lg:hidden">
                                    <BrandButton variant="ghost" className="px-2.5 py-2 text-sm font-light">Learn More<span><IconArrow className="text-black"/></span></BrandButton>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}