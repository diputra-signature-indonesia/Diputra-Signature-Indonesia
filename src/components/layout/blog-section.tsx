"use client"

import Image from "next/image"
import { BrandButton } from "../ui/button"

export function BlogSection(){
    

    const item = [
        {
            id: 1,
            title: "Optimalisasi Layanan KITAS 2025: Apa yang Berubah?",
            excerpt: "Pemerintah kembali memperbarui kebijakan terkait izin tinggal terbatas (KITAS). Perubahan ini menekankan proses yang lebih cepat dan integrasi data yang lebih kuat. Artikel ini membahas poin-poin penting yang perlu diperhatikan pemohon."
        },
        {
            id: 2,
            title: "Aturan Baru Visa Bisnis: Persyaratan yang Perlu Anda Siapkan",
            excerpt: "Mulai 2025, visa bisnis mengalami penyesuaian pada syarat dokumen serta masa berlaku. Pembaruan ini bertujuan meningkatkan transparansi dan mempermudah pelaku usaha asing untuk masuk ke Indonesia."
        },
        {
            id: 3,
            title: "Penerapan OSS RBA Terbaru: Dampaknya bagi Perizinan Usaha",
            excerpt: "OSS RBA kini memiliki fitur validasi otomatis yang membantu pengurusan izin menjadi lebih akurat. Artikel ini menjelaskan perubahan utama serta bagaimana pelaku usaha dapat mempersiapkan diri."
        },
        {
            id: 4,
            title: "Harmonisasi Pajak Daerah untuk Pelaku Usaha di Bali",
            excerpt: "Pemda Bali menerapkan kebijakan baru terkait Pajak Daerah dan Retribusi. Langkah ini diambil untuk menyederhanakan proses administrasi dan meningkatkan kepatuhan pelaku usaha lokal maupun asing."
        },
        {
            id: 5,
            title: "Update Peraturan Tenaga Kerja Asing 2025",
            excerpt: "Kementerian Ketenagakerjaan merilis regulasi baru terkait penggunaan TKA, termasuk prosedur RPTKA dan notifikasi kerja. Pembaruan ini dirancang untuk meningkatkan keamanan dan kepastian hukum bagi perusahaan."
        },
        {
            id: 6,
            title: "Update Peraturan Tenaga Kerja Asing 2025",
            excerpt: "Kementerian Ketenagakerjaan merilis regulasi baru terkait penggunaan TKA, termasuk prosedur RPTKA dan notifikasi kerja. Pembaruan ini dirancang untuk meningkatkan keamanan dan kepastian hukum bagi perusahaan."
        },
    ]

    return(
        <section className="flex flex-col max-w-[1440px] mx-auto gap-7 brand-section-px brand-section-py **:brand-stretch **:font-raleway">
            <div className="flex flex-col w-full items-end">
                <div className="flex flex-col items-end w-xs sm:w-sm lg:w-lg">
                    <h2 className="brand-h1-semi">Latest <span className="brand-h1 text-brand-maroon">News</span></h2>
                    <p className="brand-p-desc text-right text-balance">Dapatkan update terbaru seputar legalitas, peraturan pemerintah, imigrasi, dan bisnis di Indonesia.</p>
                </div>
                <div className="flex w-full justify-end gap-2.5">
                    <input type="text" className="w-full max-sm:max-w-3xs sm:max-w-80 lg:max-w-96 px-5 py-2 text-xs sm:text-sm lg:text-base font-light rounded-xl border" />
                    <BrandButton variant="white" className="px-5 sm:px-7 lg:px-10 my-auto font-light">Find</BrandButton>
                </div>
            </div>
            <div className="w-full mx-auto lg:columns-2 xl:columns-3 xl:max-w-7xl">
                {item.map((item)=>(
                    <div key={item.id} className="flex w-full h-fit gap-2.5 mb-3 sm:mb-5 lg:mb-10">
                        <div className="flex flex-col w-fit text-[14px] max-lg:hidden">
                            <p className="pb-2.5 border-b">01</p>
                            <p className="py-2.5 border-b">12</p>
                            <p className="pt-2.5">20 25</p>
                        </div>
                        <div className="flex w-full overflow-hidden sm:border sm:border-brand-gray lg:flex-col">
                            <Image alt="blog-1" src={'/image/news_image.png'} width={300} height={200} className="max-h-44 object-cover max-sm:h-20 max-sm:w-36 sm:w-2/5 lg:w-full lg:h-[200px]"/>
                            <div className="flex flex-col w-full p-2 lg:p-5 gap-1 sm:gap-2.5">
                                <h3 className="sm:text-balance brand-h3 font-normal line-clamp-2">{item.title}</h3>
                                <p className="max-sm:hidden sm:text-sm font-light line-clamp-3 lg:line-clamp-4">{item.excerpt}</p>
                                <p className="text-[9px] sm:text-[12px] lg:hidden">01/12/2025</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
                
        </section>
    )
}