import { SiteFooter, SiteFooterFallback } from '@/components/layout/site-footer';
import { SiteNavbar, SiteNavbarFallback } from '@/components/layout/site-navbar';
import RootClient from '@/components/root-client';
import { CONTACT_LINK, NAV_ITEMS } from '@/data/navigation';
import { dsiLocalBusinessJsonLd } from '@/lib/schema-dsi';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';

async function getCurrentYear() {
  'use cache';
  cacheLife('days');

  return new Date().getFullYear();
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const currentYear = await getCurrentYear();

  return (
    <>
      <script
        id="dsi-localbusiness-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(dsiLocalBusinessJsonLd),
        }}
      />
      <RootClient>
        <Suspense fallback={<SiteNavbarFallback navItems={NAV_ITEMS} contactLink={CONTACT_LINK} />}>
          <SiteNavbar navItems={NAV_ITEMS} contactLink={CONTACT_LINK} />
        </Suspense>
        <main className="overflow-x-hidden">{children}</main>
        <Suspense fallback={<SiteFooterFallback navItems={NAV_ITEMS} contactLink={CONTACT_LINK} currentYear={currentYear} />}>
          <SiteFooter navItems={NAV_ITEMS} contactLink={CONTACT_LINK} currentYear={currentYear} />
        </Suspense>
      </RootClient>
    </>
  );
}
