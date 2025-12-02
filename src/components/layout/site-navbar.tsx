"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import IconBurger from "@/icons/BrandIconBurger";
import { usePathname } from "next/navigation";

export function SiteNavbar({ isHeroInView }: { isHeroInView: boolean }){
    const [open, setOpen] = useState(false);

    const pathname = usePathname();

    const navItems = [
        {href: "/", label: "Home"},
        {href: "/about", label: "About"},
        {href: "/services/legal", label: "Legal"},
        {href: "/services/visa", label: "Visa"},
        {href: "/services/real-estate", label: "Real Estate"},
    ]

  return (
    <header className="fixed w-full top-0 z-50 sm:px-5 lg:px-10 bg-transparent text-brand-yellow max-lg:**:text-sm">
        <div className="relative w-full flex flex-row justify-between items-center">
            <Link href={"/"} className="px-5 pt-6 sm:pt-7 lg:pt-8 pb-5 flex items-center gap-4">
                <span className="size-[1em] aspect-square">
                    <Image alt={'diputra-signature-indonesia'} src={'/vercel.svg'} width={20} height={20} className="size-full"/>
                </span>
                <span className="hidden sm:block font-raleway text-base tracking-wider">Diputra Signature Indonesia</span>
                <span className="sm:hidden font-raleway text-base tracking-wider">DSI</span>
            </Link>
            <nav className="hidden lg:flex flex-row"  aria-label="Primary navigation">
                {navItems.map((item)=>{
                    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                    return (
                    <Link key={item.href} href={item.href} className={`px-5 pt-6 sm:pt-7 lg:pt-8 pb-5 font-raleway text-base ${isActive ? 'font-semibold' : 'font-normal'}`}>
                        {item.label}
                    </Link>)
                })}
            </nav>
            <Link href="/#contact" className="hidden lg:block px-5 pt-6 sm:pt-7 lg:pt-8 pb-5 font-raleway text-base">Contact Us</Link>
            <button className="lg:hidden px-5 pt-6 sm:pt-7 lg:pt-8 pb-5" onClick={() => setOpen(prev => !prev)} aria-label="Toggle navigation" aria-expanded={open}>
                <IconBurger className="size-6"/>
            </button>

            {open && (
                <div
                    className="fixed inset-0 bg-black/30"
                    onClick={() => setOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 right-0 w-60 sm:w-80 bg-brand-white ${open ? 'translate-x-0' : 'translate-x-full'} transform transition-transform duration-300 ease-out`}>
                <div className="flex items-center justify-between px-7 pt-6 sm:pt-7 lg:pt-8 pb-5">
                    <span className="font-raleway text-base tracking-wider">Menu</span>
                    <button onClick={() => setOpen((prev) => !prev)} aria-label="Close navigation">
                        <IconBurger className="size-6"/>
                    </button>
                </div>
                <div className="flex flex-col mt-7 mb-4">
                    {navItems.map((item)=>(
                        <Link key={item.href} href={item.href} className="px-7 py-5 font-raleway text-base">
                            {item.label}
                        </Link>
                    ))}
                </div>
                <div className="flex mt-7">
                    <Link href="/#contact" className="px-7 py-5 font-raleway text-base">Contact Us</Link>
                </div>
            </div>
        </div>
    </header>
  );
}