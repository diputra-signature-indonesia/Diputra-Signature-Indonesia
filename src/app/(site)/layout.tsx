import Script from 'next/script';
import { SiteNavbar } from '@/components/layout/site-navbar';
import { SiteFooter } from '@/components/layout/site-footer';
import RootClient from '@/components/root-client';
import { dsiLocalBusinessJsonLd } from '@/lib/schema-dsi';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
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
      <SiteNavbar isHeroInView={false} />
      <main>{children}</main>
      <SiteFooter />
    </RootClient>
  );
}
