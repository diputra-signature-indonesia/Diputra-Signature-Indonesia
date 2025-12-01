import Image from "next/image"
import { BrandButton } from "../ui/button";
import IconArrow from "@/icons/BrandIconArrow";

export function ServicesSection(){

    const services = [
        {
            id: 0,
            title: "Legal",
            description:
            "Layanan konsultasi hukum untuk kebutuhan bisnis dan perorangan, termasuk penyusunan dokumen legal, perjanjian, kontrak, serta pendampingan kepatuhan hukum di Indonesia.",
            image: "/image/services-legal-image.png",
        },
        {
            id: 1,
            title: "Visa",
            description:
            "Pendampingan lengkap pengurusan visa, izin tinggal (KITAS/KITAP), izin kerja, dan imigrasi lainnya bagi ekspatriat serta perusahaan yang mempekerjakan tenaga asing.",
            image: "/image/services-visa-image.png",
        },
        {
            id: 2,
            title: "Real Estate",
            description:
            "Layanan legal terkait properti, mulai dari due diligence, legalitas tanah dan bangunan, verifikasi dokumen, hingga pendampingan transaksi jual beli atau sewa properti.",
            image: "/image/services-realestate-image.jpg",
        },
    ];

    return(
        
        <section className="flex flex-col max-w-[1440px] mx-auto brand-section-px brand-section-py **:brand-stretch **:font-raleway">
            <div className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
                <h2 className="brand-h1 text-brand-maroon">Diputra <span className="brand-h1-semi text-black">Services</span></h2>
                <p className="brand-p-desc text-balance text-left sm:pl-5 lg:pl-10 sm:border-l">Kami menyediakan berbagai layanan yang dirancang untuk mendukung kebutuhan legal, bisnis, dan imigrasi Anda. </p>
            </div>
            <div className="flex flex-col xl:flex-row w-full  xl:h-[550px] xl:min-h-[550px] gap-3 sm:gap-5 text-white">
                {services.map((item)=> (
                    <article key={item.id} className="relative size-full flex flex-col overflow-hidden">
                        <Image src={item.image} alt={item.title} fill priority={false} className="-z-20 object-cover brightness-75"/>
                        <div className="absolute -z-10 inset-0 bg-black/40" />
                        <h3 className="w-full p-5 brand-h3">{item.title}</h3>
                        <div className="flex flex-col gap-2.5 p-5 h-full">
                            <p className="max-sm:indent-10 brand-p max-sm:text-justify sm:text-balance xl:text-pretty mt-auto">{item.description}</p>
                            <BrandButton variant="ghost" className="text-white px-0 w-full justify-end">Learn More <span><IconArrow className="text-white"/></span></BrandButton>
                        </div>
                    </article>
                ))}
                
            </div>
        </section>

    )
}