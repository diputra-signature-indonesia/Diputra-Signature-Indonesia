'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import IconBurger from '@/icons/BrandIconBurger';
import { usePathname } from 'next/navigation';
import IconArrow from '@/icons/BrandIconArrow';
import type { NavItem, NavLinkItem } from '@/data/navigation';
import { isDropdown } from '@/data/navigation';

export function SiteNavbar({ navItems, contactLink }: { navItems: NavItem[]; contactLink: NavLinkItem }) {
  const [open, setOpen] = useState(false);
  const [serviceDropDown, setServiceDropDown] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setServiceDropDown(false);
  }, [pathname]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = dropdownRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setServiceDropDown(false);
    }

    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  // untuk mobile menu (biar tetap sederhana: semua link tampil)
  const mobileNavItems: NavLinkItem[] = navItems.flatMap((item) => (isDropdown(item) ? item.children : [item]));

  return (
    <header className="bg-brand-white text-brand-black sticky top-0 z-50 w-full px-5 shadow-md transition-colors duration-500 max-lg:**:text-sm sm:px-10 lg:px-13">
      <div className="relative flex w-full flex-row items-center justify-between">
        <Link href="/" className={`flex items-center gap-4 pt-6 pb-5 sm:pt-7 lg:pt-8`}>
          <span className="aspect-square size-[1em]">
            <Image alt="diputra-signature-indonesia" src="/vercel.svg" width={20} height={20} className="size-full" />
          </span>
          <span className="font-raleway text-brand-burgundy hidden text-xs font-medium tracking-wider sm:block">
            Diputra <br />
            <span className="text-brand-black text-[10px] font-normal">Signature Indonesia</span>
          </span>
          <span className="font-raleway text-base tracking-wider sm:hidden">DSI</span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className={`flex flex-row max-lg:hidden`} aria-label="Primary navigation">
          {navItems.map((item) => {
            // normal link
            if (!isDropdown(item)) {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-raleway group hover:text-brand-burgundy relative px-5 pt-6 pb-5 text-base hover:bg-gray-100 sm:pt-7 lg:pt-8 ${isActive ? 'text-brand-burgundy font-semibold' : 'font-normal'}`}
                >
                  <span className={`group-hover:bg-brand-yellow absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 transition-all duration-300 group-hover:w-full`} />
                  {item.label}
                </Link>
              );
            }

            const servicesActive = pathname.startsWith('/services');

            return (
              <div key={item.label} ref={dropdownRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={serviceDropDown}
                  onClick={() => setServiceDropDown((v) => !v)}
                  className={`font-raleway group hover:text-brand-burgundy relative cursor-pointer px-5 pt-6 pb-5 text-base select-none sm:pt-7 lg:pt-8 ${servicesActive ? 'text-brand-burgundy font-semibold' : 'font-normal'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    <span className={`transition-transform duration-200 ${serviceDropDown && 'rotate-180'}`}>
                      <IconArrow className={`group-hover:text-brand-burgundy size-5 rotate-90 ${servicesActive ? 'text-brand-burgundy' : 'text-brand-black'}`} />
                    </span>
                  </span>
                  <span
                    className={`group-hover:bg-brand-yellow absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 transition-all duration-300 group-hover:w-full ${servicesActive && 'bg-brand-burgundy w-full'}`}
                  />
                </button>
                <div role="menu" className={`absolute top-full left-0 -z-10 w-[340px] overflow-hidden bg-white shadow-lg ${serviceDropDown ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${serviceDropDown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="text-brand-black py-2">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`font-raleway brand-p hover:text-brand-burgundy block px-4 py-3 text-left text-sm transition-colors hover:bg-gray-100 ${isChildActive ? 'text-brand-burgundy font-semibold' : 'font-normal'}`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <Link href={contactLink.href} className={`hidden`}>
            Contact Us
          </Link>
        </nav>

        <Link href={contactLink.href} className={`font-raleway group relative pt-6 pb-5 text-base max-lg:hidden sm:pt-7 lg:pt-8 ${pathname === contactLink.href && 'font-semibold'}`}>
          {/* */}
          Contact Us
          <span className={`group-hover:bg-brand-yellow absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 transition-all duration-300 group-hover:w-full`} />
        </Link>

        {/* MOBILE TOGGLE */}
        <button
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="site-mobile-nav"
          className={`cursor-pointer pt-6 pr-5 pb-5 sm:pt-7 sm:pr-10 lg:hidden lg:pt-8 lg:pr-13`}
          onClick={() => setOpen((prev) => !prev)}
        >
          <IconBurger className={`text-brand-black size-6`} />
        </button>

        {open && <div className="fixed inset-0 h-screen bg-black/30" onClick={() => setOpen(false)} />}

        {/* MOBILE DRAWER */}
        <div
          id="site-mobile-nav"
          className={`bg-brand-burgundy text-brand-white fixed inset-y-0 right-0 flex h-screen w-72 flex-col sm:w-80 ${
            open ? 'translate-x-0' : 'translate-x-full'
          } transform transition-transform duration-300 ease-out`}
        >
          <div className="bg-brand-black/50 flex items-center justify-between pt-6 pr-5 pb-5 pl-7 sm:pt-7 sm:pr-10 lg:pt-8 lg:pr-13">
            <span className="font-raleway text-base tracking-wider">Menu</span>
            <button onClick={() => setOpen(false)} aria-label="Close navigation" className="cursor-pointer">
              <IconBurger className="size-6" />
            </button>
          </div>

          <div className="hide-scrollbar mt-7 mb-4 flex h-full flex-col overflow-y-scroll">
            {mobileNavItems.map((item) => {
              const isChildActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`font-raleway hover:bg-brand-black/10 relative px-7 py-4 text-base text-balance ${isChildActive ? 'font-semibold' : 'font-normal'}`}
                >
                  {item.label}
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-[90%] -translate-x-1/2 bg-red-900" />
                </Link>
              );
            })}
          </div>

          <div className="mt-7 flex w-full border-t-2 border-red-900">
            <Link href={contactLink.href} onClick={() => setOpen(false)} className="font-raleway hover:bg-brand-black/10 w-full px-7 py-4 text-base">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
