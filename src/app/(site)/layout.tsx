'use client';

import Script from 'next/script';
import { SiteNavbar } from '@/components/layout/site-navbar';
import { SiteFooter } from '@/components/layout/site-footer';
import RootClient from '@/components/root-client';
import { dsiLocalBusinessJsonLd } from '@/lib/schema-dsi';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isHeroInView, setIsHeroInView] = useState(false);

  useEffect(() => {
    const heroEl = document.getElementById('hero-section');

    if (!heroEl) {
      setIsHeroInView(false);
      return;
    }
    setIsHeroInView(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroInView(entry.isIntersecting);
      },
      {
        threshold: 0.1,
      }
    );
    observer.observe(heroEl);
    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <RootClient>
      {/* JSON-LD for LocalBusiness / DSI */}
      <Script
        id="dsi-localbusiness-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(dsiLocalBusinessJsonLd),
        }}
      />
      <SiteNavbar isHeroInView={isHeroInView} />
      <main>{children}</main>
      <SiteFooter />
    </RootClient>
  );
}
