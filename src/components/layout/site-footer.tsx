'use client';

import { isDropdown, NavDropdownItem, NavItem, NavLinkItem } from '@/data/navigation';
import IconEmail from '@/icons/BrandIconEmail';
import IconMap from '@/icons/BrandIconMap';
import IconPhone from '@/icons/BrandIconPhone';
import IconWhatsapp from '@/icons/BrandIconWhatsapp';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter({ navItems, contactLink }: { navItems: NavItem[]; contactLink: NavLinkItem }) {
  const pathname = usePathname();

  return (
    <footer className="brand-section-px **:font-raleway **:brand-stretch text-brand-white bg-brand-burgundy flex w-full flex-col gap-5 py-20 drop-shadow-lg">
      <p className="text-brand-white border-brand-yellow border-l-4 pl-7 text-2xl font-semibold sm:text-3xl">
        Diputra
        <span className="brand-h3 text-brand-white font-light"> Signature Indonesia</span>
      </p>
      <div className="flex flex-col gap-20 lg:flex-row xl:gap-30">
        <div className="flex w-full flex-col gap-5">
          <p className="brand-p">We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia</p>
          <div className="flex w-full flex-col gap-2.5">
            <div className="flex h-fit flex-col">
              <address className="not-italic">
                <a href="https://maps.app.goo.gl/tZ2SZFShu5k1Kae28" target="_blank" rel="noopener noreferrer" className="flex flex-row items-center gap-2.5">
                  <IconMap className="size-5" />
                  <span className="brand-p">Banjar Latusari, Desa Abiansemal, Kecamatan Abiansemal, Kabupaten Badung, Bali, Indonesia</span>
                </a>
              </address>
            </div>
            <div className="flex h-fit flex-col">
              <a href="mailto:info@diputrasignature.com" aria-label="Send email to info@diputrasignature.com" className="flex flex-row items-center gap-2.5">
                <IconEmail className="size-5" />
                <span className="brand-p">info@diputrasignature.com</span>
              </a>
            </div>
            <div className="flex h-fit flex-col">
              <a href="https://wa.me/+6287851021080" target="_blank" rel="noopener noreferrer" aria-label="Chat via WhatsApp" className="flex flex-row items-center gap-2.5">
                <IconWhatsapp className="size-5" />
                <span className="brand-p">+62 878-5102-1080</span>
              </a>
            </div>
            <div className="flex h-fit flex-col">
              <a href="tel:+6287851021080" className="flex flex-row items-center gap-2.5">
                <IconPhone className="size-5" />
                <span className="brand-p">+62 878-5102-1080</span>
              </a>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-row max-md:justify-between md:gap-20">
          <div className="flex flex-col gap-5 max-md:w-full">
            <p className="brand-h3 text-brand-white">Our Services</p>
            <div className="flex w-full flex-col gap-2.5">
              {navItems
                .filter((item): item is NavDropdownItem => item.slug === 'services' && isDropdown(item))
                .flatMap((item) => item.children)
                .map((child) => {
                  const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
                  return (
                    <Link key={child.slug} href={child.href} className={`brand-p hover:text-brand-white ${isActive ? 'font-semibold' : 'font-normal'}`}>
                      {child.label}
                    </Link>
                  );
                })}
            </div>
          </div>
          <div className="flex flex-col gap-5 max-md:w-full">
            <p className="brand-h3 text-brand-white">Navigation</p>
            <div className="flex w-full flex-col gap-2.5">
              {navItems
                .filter((item): item is NavLinkItem => item.slug !== 'services')
                .map((item) => (
                  <Link
                    key={item.slug}
                    href={item.href}
                    aria-label={`Learn more about ${item.label} Services in Bali`}
                    title={`${item.label} Services in Bali`}
                    className={`brand-p hover:text-brand-white ${pathname === item.href ? 'text-brand-white font-semibold' : 'font-normal'}`}
                  >
                    {item.label}
                  </Link>
                ))}
              <Link href={contactLink.href} className={`brand-p hover:text-brand-white ${pathname === contactLink.href && 'font-semibold'}`}>
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="border-brand-gray brand-p mt-7 border-t pt-2.5">
        <p>© {new Date().getFullYear()} Diputra Signature Indonesia. All rights reserved.</p>
      </div>
    </footer>
  );
}
