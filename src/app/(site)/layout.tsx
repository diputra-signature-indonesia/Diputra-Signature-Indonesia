import { SiteFooter } from '@/components/layout/site-footer';
import { SiteNavbar } from '@/components/layout/site-navbar';
import RootClient from '@/components/root-client';
import { CONTACT_LINK, NAV_ITEMS } from '@/data/navigation';
import { dsiLocalBusinessJsonLd } from '@/lib/schema-dsi';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
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
        <SiteNavbar navItems={NAV_ITEMS} contactLink={CONTACT_LINK} />
        <main className="overflow-x-hidden">{children}</main>
        <SiteFooter navItems={NAV_ITEMS} contactLink={CONTACT_LINK} />
      </RootClient>
    </>
  );
}
