import { NAV_ITEMS, CONTACT_LINK } from '@/data/navigation';
import { SiteNavbar } from '@/components/layout/site-navbar';
import { SiteFooter } from '@/components/layout/site-footer';
import RootClient from '@/components/root-client';
import { dsiLocalBusinessJsonLd } from '@/lib/schema-dsi';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootClient>
      {/* JSON-LD for LocalBusiness / DSI */}
      <script
        id="dsi-localbusiness-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(dsiLocalBusinessJsonLd),
        }}
      />
      <SiteNavbar navItems={NAV_ITEMS} contactLink={CONTACT_LINK} />
      <main>{children}</main>
      <SiteFooter navItems={NAV_ITEMS} contactLink={CONTACT_LINK} />
    </RootClient>
  );
}
