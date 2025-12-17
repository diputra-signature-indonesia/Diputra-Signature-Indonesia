'use client';

import IconMap from '@/icons/BrandIconMap';
import IconEmail from '@/icons/BrandIconEmail';
import IconWhatsapp from '@/icons/BrandIconWhatsapp';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
  ];
  const servicesItems = [
    { href: '/services/legal', label: 'Legal' },
    { href: '/services/visa', label: 'Visa' },
    { href: '/services/real-estate', label: 'Real Estate' },
  ];

  return (
    <footer className="brand-section-px **:font-raleway **:brand-stretch text-brand-black flex w-full flex-col gap-5 bg-white py-20 drop-shadow-lg">
      <p className="text-brand-burgundy border-brand-yellow border-l-4 pl-7 text-2xl font-semibold sm:text-3xl">
        Diputra
        <span className="brand-h3 text-brand-black font-light"> Signature Indonesia</span>
      </p>
      <div className="flex flex-col gap-20 lg:flex-row xl:gap-40">
        <div className="flex w-full flex-col gap-5">
          <p className="brand-p">We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia</p>
          <div className="flex w-full flex-col gap-2.5">
            <div className="flex h-fit flex-col">
              <address className="not-italic">
                <div className="flex flex-row items-center gap-2.5">
                  <IconMap className="size-5" />
                  <span className="brand-p">Jalan Gunung Bahlil</span>
                </div>
              </address>
            </div>
            <div className="flex h-fit flex-col">
              <a href="mailto:DSIInfo@diputraSignature.com" aria-label="Send email to DSIInfo@diputraSignature.com" className="flex flex-row items-center gap-2.5">
                <IconEmail className="size-5" />
                <span className="brand-p">DSIInfo@diputraSignature.com</span>
              </a>
            </div>
            <div className="flex h-fit flex-col">
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" aria-label="Chat via WhatsApp" className="flex flex-row items-center gap-2.5">
                <IconWhatsapp className="size-5" />
                <span className="brand-p">+62811234567890</span>
              </a>
            </div>
            <div className="flex h-fit flex-col">
              <a href="tel:+62811234567890" className="flex flex-row items-center gap-2.5">
                <IconWhatsapp className="size-5" />
                <span className="brand-p">+62811234567890</span>
              </a>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-row max-md:justify-between md:gap-36">
          <div className="flex flex-col gap-5 max-md:w-full">
            <p className="brand-h3 text-brand-burgundy">Our Services</p>
            <div className="flex w-full flex-col gap-2.5">
              {servicesItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={`brand-p ${isActive ? 'font-semibold' : 'font-normal'}`}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-5 max-md:w-full">
            <p className="brand-h3 text-brand-burgundy">Navigation</p>
            <div className="flex w-full flex-col gap-2.5">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={`brand-p ${pathname === item.href ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </Link>
              ))}
              <Link href="/#contact" className="brand-p">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="border-brand-gray brand-p mt-20 border-t pt-2.5">
        <p>© {new Date().getFullYear()} Diputra Signature Indonesia. All rights reserved.</p>
      </div>
    </footer>
  );
}
