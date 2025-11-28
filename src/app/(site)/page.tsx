import { BrandButton } from "@/components/ui/button"
import { SiteNavbar } from "@/components/layout/site-navbar"
import { SiteFooter } from "@/components/layout/site-footer"

export default function HomePage() {
  return (
    <div>
      <SiteNavbar isHeroInView={false}/>
      <SiteFooter/>

    </div>
  );
}