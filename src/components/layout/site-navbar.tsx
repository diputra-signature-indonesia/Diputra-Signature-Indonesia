'use client';

import type { NavItem, NavLinkItem } from '@/data/navigation';
import { isDropdown } from '@/data/navigation';
import IconArrow from '@/icons/BrandIconArrow';
import IconBurger from '@/icons/BrandIconBurger';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type SiteNavbarProps = {
  navItems: NavItem[];
  contactLink: NavLinkItem;
};

// Dipertahankan agar tab kategori service dapat diaktifkan kembali jika dibutuhkan.
const SHOW_SERVICE_CATEGORY_TABS = false;

export function SiteNavbar(props: SiteNavbarProps) {
  const pathname = usePathname();
  return <SiteNavbarContent key={pathname} {...props} pathname={pathname} />;
}

export function SiteNavbarFallback(props: SiteNavbarProps) {
  return <SiteNavbarContent {...props} pathname="" />;
}

function SiteNavbarContent({ navItems, contactLink, pathname }: SiteNavbarProps & { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [serviceDropDown, setServiceDropDown] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const headerRef = useRef<HTMLElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const serviceTabsRef = useRef<HTMLDivElement | null>(null);
  const activeServiceTabRef = useRef<HTMLAnchorElement | null>(null);
  const lastScrollY = useRef(0);

  const isServicePage = pathname.startsWith('/services/');
  const servicesNavigation = navItems.find((item) => isDropdown(item) && item.slug === 'services');
  const serviceItems = servicesNavigation && isDropdown(servicesNavigation) ? servicesNavigation.children : [];
  const showServiceCategoryTabs = SHOW_SERVICE_CATEGORY_TABS && isServicePage && serviceItems.length > 0;

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const updateHeight = () => {
      setHeaderHeight(el.offsetHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = dropdownRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setServiceDropDown(false);
    }

    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  useEffect(() => {
    if (!isServicePage) return;

    lastScrollY.current = window.scrollY;

    function onScroll() {
      const currentScrollY = window.scrollY;
      const scrollDifference = currentScrollY - lastScrollY.current;

      if (currentScrollY <= headerHeight) {
        setHeaderHidden(false);
      } else if (Math.abs(scrollDifference) >= 6) {
        setHeaderHidden(scrollDifference > 0);
      }

      lastScrollY.current = currentScrollY;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isServicePage, headerHeight]);

  useEffect(() => {
    const tabs = serviceTabsRef.current;
    const activeTab = activeServiceTabRef.current;
    if (!showServiceCategoryTabs || !tabs || !activeTab) return;

    const frame = window.requestAnimationFrame(() => {
      tabs.scrollTo({
        left: activeTab.offsetLeft - (tabs.clientWidth - activeTab.clientWidth) / 2,
        behavior: 'auto',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, showServiceCategoryTabs]);

  // untuk mobile menu (biar tetap sederhana: semua link tampil)
  const mobileNavItems: NavLinkItem[] = navItems.flatMap((item) => (isDropdown(item) ? item.children : [item]));

  const shouldHideHeader = isServicePage && headerHidden && !open && !serviceDropDown;

  return (
    <div
      className={`sticky top-0 z-50 w-full ${isServicePage ? 'transition-transform duration-300 ease-in-out will-change-transform' : ''}`}
      style={{
        transform: shouldHideHeader ? `translateY(-${headerHeight}px)` : undefined,
      }}
    >
      <header ref={headerRef} className="bg-brand-white text-brand-black w-full px-5 shadow-md max-lg:**:text-sm sm:px-10 lg:px-13">
        <div className="relative flex w-full flex-row items-center justify-between">
          <Link href="/" className={`flex items-center gap-4 pt-6 pb-5 sm:pt-7 lg:pt-8`}>
            <Image alt="diputra-signature-indonesia" src="/icon/dsi-logo.png" width={100} height={50} className="h-8 w-auto object-contain" />
            {/* <span className="font-raleway text-base tracking-wider sm:hidden">DSI</span> */}
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
                                aria-label={`Learn more about ${child.label} Services in Bali`}
                                title={`${child.label} Services in Bali`}
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

      {showServiceCategoryTabs && (
        <nav aria-label="Service categories" className="border-brand-black/10 bg-brand-white border-t border-b shadow-sm">
          <div ref={serviceTabsRef} className="hide-scrollbar w-full snap-x snap-mandatory overflow-x-auto">
            <div className="mx-auto flex w-max max-w-[1440px] min-w-full items-stretch justify-center px-5 sm:px-10 lg:px-13">
              {serviceItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    ref={isActive ? activeServiceTabRef : undefined}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`font-raleway hover:text-brand-burgundy relative flex shrink-0 snap-start items-center justify-center px-8 py-4 text-center text-sm whitespace-nowrap transition-colors hover:bg-gray-50 lg:px-10 ${
                      isActive ? 'text-brand-burgundy font-semibold' : 'text-brand-black font-medium'
                    }`}
                  >
                    {item.label}
                    <span className={`absolute right-5 bottom-0 left-5 h-0.5 transition-colors ${isActive ? 'bg-brand-yellow' : 'bg-transparent'}`} />
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
