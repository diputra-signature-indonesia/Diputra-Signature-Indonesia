'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import IconBurger from '@/icons/BrandIconBurger';
import { usePathname } from 'next/navigation';
import IconArrow from '@/icons/BrandIconArrow';

type NavLinkItem = { href: string; label: string };
type NavDropdownItem = { label: string; children: NavLinkItem[] };
type NavItem = NavLinkItem | NavDropdownItem;

function isDropdown(item: NavItem): item is NavDropdownItem {
  return 'children' in item;
}

export function SiteNavbar({ isHeroInView = true }: { isHeroInView: boolean }) {
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

  const navItems: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    {
      label: 'Services',
      children: [
        { href: '/services/legal', label: 'Legal' },
        { href: '/services/visa', label: 'Visa' },
        { href: '/services/real-estate', label: 'Real Estate' },
        { href: '/services/insurance', label: 'Insurance' },
        {
          href: '/services/intellectual-property-and-trademark-registration-services',
          label: 'Intellectual Property & Trademark Registration',
        },
      ],
    },
  ];

  // untuk mobile menu (biar tetap sederhana: semua link tampil)
  const mobileNavItems: NavLinkItem[] = navItems.flatMap((item) => (isDropdown(item) ? item.children : [item]));

  return (
    <header className="bg-brand-white text-brand-black sticky top-0 z-50 w-full shadow-md transition-colors duration-500 max-lg:**:text-sm">
      <div className="relative flex w-full flex-row items-center justify-between">
        <Link href="/" className={`flex items-center gap-4 pt-6 pb-5 pl-5 sm:pt-7 sm:pl-10 lg:pt-8 lg:pl-13 ${isHeroInView ? '*:text-brand-black' : '*:text-brand-black'}`}>
          <span className="aspect-square size-[1em]">
            <Image alt="diputra-signature-indonesia" src="/vercel.svg" width={20} height={20} className="size-full" />
          </span>
          <span className="font-raleway hidden text-base tracking-wider sm:block">Diputra Signature Indonesia</span>
          <span className="font-raleway text-base tracking-wider sm:hidden">DSI</span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className={`${!isHeroInView ? 'hidden' : 'flex'} flex-row max-lg:hidden`} aria-label="Primary navigation">
          {navItems.map((item) => {
            // normal link
            if (!isDropdown(item)) {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`font-raleway px-5 pt-6 pb-5 text-base sm:pt-7 lg:pt-8 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </Link>
              );
            }

            // dropdown "Services"
            const servicesActive = pathname.startsWith('/services');

            return (
              <div key={item.label} ref={dropdownRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={serviceDropDown}
                  onClick={() => setServiceDropDown((v) => !v)}
                  className={`font-raleway cursor-pointer px-5 pt-6 pb-5 text-base select-none sm:pt-7 lg:pt-8 ${servicesActive ? 'font-semibold' : 'font-normal'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    <span className={`transition-transform duration-200 ${serviceDropDown && 'rotate-180'}`}>
                      <IconArrow className="size-5 rotate-90" />
                    </span>
                  </span>
                </button>
                <div role="menu" className={`absolute top-full left-0 -z-10 w-[340px] overflow-hidden bg-white shadow-lg ${serviceDropDown ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${serviceDropDown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="py-2">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`block px-4 py-3 text-left text-sm transition-colors hover:bg-gray-100 ${isChildActive ? 'font-semibold' : 'font-normal'}`}
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
        </nav>

        <Link href="/contact" className={`${!isHeroInView ? 'hidden' : 'block'} font-raleway pt-6 pr-5 pb-5 text-base max-lg:hidden sm:pt-7 sm:pr-10 lg:pt-8 lg:pr-13`}>
          Contact Us
        </Link>

        {/* MOBILE TOGGLE */}
        <button
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="site-mobile-nav"
          className={`pt-6 pr-5 pb-5 sm:pt-7 sm:pr-10 lg:pr-13 ${isHeroInView && 'hidden'} max-lg:block lg:pt-8`}
          onClick={() => setOpen((prev) => !prev)}
        >
          <IconBurger className={`size-6 ${isHeroInView ? 'max-lg:text-brand-yellow' : 'text-brand-black'}`} />
        </button>

        {open && <div className="fixed inset-0 h-screen bg-black/30" onClick={() => setOpen(false)} />}

        {/* MOBILE DRAWER */}
        <div
          id="site-mobile-nav"
          className={`bg-brand-white text-brand-black fixed inset-y-0 right-0 h-screen w-60 sm:w-80 ${
            open ? 'translate-x-0' : 'translate-x-full'
          } transform transition-transform duration-300 ease-out`}
        >
          <div className="flex items-center justify-between pt-6 pr-5 pb-5 pl-7 sm:pt-7 sm:pr-10 lg:pt-8 lg:pr-13">
            <span className="font-raleway text-base tracking-wider">Menu</span>
            <button onClick={() => setOpen(false)} aria-label="Close navigation">
              <IconBurger className="size-6" />
            </button>
          </div>

          <div className="mt-7 mb-4 flex flex-col">
            {mobileNavItems.map((item) => {
              const isChildActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`font-raleway px-7 py-5 text-base hover:bg-gray-200 ${isChildActive ? 'font-semibold' : 'font-normal'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-7 flex">
            <Link href="/contact" onClick={() => setOpen(false)} className="font-raleway px-7 py-5 text-base hover:bg-gray-200">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
