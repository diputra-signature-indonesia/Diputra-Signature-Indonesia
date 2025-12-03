'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import IconBurger from '@/icons/BrandIconBurger';
import { usePathname } from 'next/navigation';

export function SiteNavbar({ isHeroInView = true }: { isHeroInView: boolean }) {
  const [open, setOpen] = useState(false);

  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/services/legal', label: 'Legal' },
    { href: '/services/visa', label: 'Visa' },
    { href: '/services/real-estate', label: 'Real Estate' },
  ];

  return (
    <header
      className={
        `text-brand-yellow fixed top-0 z-50 w-full max-lg:**:text-sm sm:px-5 lg:px-10` +
        (isHeroInView ? 'text-brand-yellow bg-transparent shadow-md backdrop-blur' : 'bg-brand-white text-brand-black shadow-md backdrop-blur')
      }
    >
      <div className="relative flex w-full flex-row items-center justify-between">
        <Link href={'/'} className="flex items-center gap-4 px-5 pt-6 pb-5 sm:pt-7 lg:pt-8">
          <span className="aspect-square size-[1em]">
            <Image alt={'diputra-signature-indonesia'} src={'/vercel.svg'} width={20} height={20} className="size-full" />
          </span>
          <span className="font-raleway hidden text-base tracking-wider sm:block">Diputra Signature Indonesia</span>
          <span className="font-raleway text-base tracking-wider sm:hidden">DSI</span>
        </Link>
        <nav className="hidden flex-row lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`font-raleway px-5 pt-6 pb-5 text-base sm:pt-7 lg:pt-8 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/#contact" className="font-raleway hidden px-5 pt-6 pb-5 text-base sm:pt-7 lg:block lg:pt-8">
          Contact Us
        </Link>
        <button aria-label="Toggle navigation" aria-expanded={open} aria-controls="site-mobile-nav" className="px-5 pt-6 pb-5 sm:pt-7 lg:hidden lg:pt-8" onClick={() => setOpen((prev) => !prev)}>
          <IconBurger className="size-6" />
        </button>

        {open && <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />}

        <div id="site-mobile-nav" className={`bg-brand-white fixed inset-y-0 right-0 w-60 sm:w-80 ${open ? 'translate-x-0' : 'translate-x-full'} transform transition-transform duration-300 ease-out`}>
          <div className="flex items-center justify-between px-7 pt-6 pb-5 sm:pt-7 lg:pt-8">
            <span className="font-raleway text-base tracking-wider">Menu</span>
            <button onClick={() => setOpen((prev) => !prev)} aria-label="Close navigation">
              <IconBurger className="size-6" />
            </button>
          </div>
          <div className="mt-7 mb-4 flex flex-col">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="font-raleway px-7 py-5 text-base">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-7 flex">
            <Link href="/#contact" onClick={() => setOpen(false)} className="font-raleway px-7 py-5 text-base">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
