"use client"

import IconMap from "@/icons/BrandIconMap"
import IconEmail from "@/icons/BrandIconEmail"
import IconWhatsapp from "@/icons/BrandIconWhatsapp"
import Link from "next/link";
import { usePathname } from "next/navigation";


export function SiteFooter(){
    const pathname = usePathname();
    const navItems = [
        {href: "/", label: "Home"},
        {href: "/about", label: "About"},
    ]
    const servicesItems = [
        {href: "/services/legal", label: "Legal"},
        {href: "/services/visa", label: "Visa"},
        {href: "/services/real-estate", label: "Real Estate"},
    ]

    return (
        <footer className="w-full flex flex-col bg-brand-black py-20 brand-section-px text-white gap-5 **:font-raleway **:brand-stretch">
            <p className=" font-semibold text-2xl sm:text-3xl text-brand-yellow">
                Diputra
                <span className="font-light brand-h3 text-brand-white"> Signature Indonesia</span>
            </p>
            <div className="flex flex-col lg:flex-row gap-20 xl:gap-40">
                <div className="flex flex-col w-full gap-5">
                    <p className="brand-p">We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia</p>
                    <div className="flex flex-col w-full gap-4">
                        <div className="flex flex-col h-fit">
                            <address className="not-italic">
                                <div className="flex flex-row gap-2.5 items-center">
                                    <IconMap className="size-5" />
                                    <span className="brand-p">Jalan Gunung Bahlil</span>
                                </div>
                            </address>
                        </div>
                        <div className="flex flex-col h-fit">
                            <a href="mailto:DSIInfo@diputraSignature.com" className="flex flex-row gap-2.5 items-center">
                                <IconEmail className="size-5"/>
                                <span className="brand-p">DSIInfo@diputraSignature.com</span>
                            </a>
                        </div>
                        <div className="flex flex-col h-fit">
                            <a href="https://wa.me/" className="flex flex-row gap-2.5 items-center">
                                <IconWhatsapp className="size-5" />
                                <p className="brand-p">+62811234567890</p>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row w-full max-md:justify-between md:gap-36">
                    <div className="flex flex-col gap-5 max-md:w-full">
                        <p className="brand-h3 text-brand-yellow">Our Services</p>
                        <div className="flex flex-col w-full gap-4">
                            {servicesItems.map((item)=>{
                                const isActive = pathname.startsWith(item.href);
                                return (
                                <Link key={item.href} href={item.href} className={` brand-p  ${isActive ? 'font-semibold' : 'font-normal'}`}>
                                    {item.label}
                                </Link>)
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-5 max-md:w-full">
                        <p className="brand-h3 text-brand-yellow">Navigation</p>
                        <div className="flex flex-col w-full gap-4">
                            {navItems.map((item)=>(
                                <Link key={item.href} href={item.href} className={`brand-p  ${pathname === item.href ? 'font-semibold' : 'font-normal'}`}>
                                    {item.label}
                                </Link>
                            ))}
                            <Link href="/#contact" className="brand-p">Contact Us</Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="pt-2.5 mt-20 border-t border-brand-gray  brand-p ">
                <p>© {new Date().getFullYear()} Diputra Signature Indonesia. All rights reserved.</p>
            </div>
        </footer>
    )
}