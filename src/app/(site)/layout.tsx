import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer"

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>
          <SiteNavbar isHeroInView={false}/>
          <main>
            {children}
          </main>
          <SiteFooter/>
        </>;
}
