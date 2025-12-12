import { BlogSection } from '@/components/layout/section-blog';
import { ContactSection } from '@/components/layout/section-contact';
import { ServicesSection } from '@/components/layout/section-services';
import { ReviewSection } from '@/components/layout/section-review';
import { AdvantageSection } from '@/components/layout/section-advantage';
import { AboutSection } from '@/components/layout/section-about';
import { HeroSection } from '@/components/layout/section-home-hero';
import { CtaSection } from '@/components/layout/section-cta';
import Image from 'next/image';

export const metadata = {
  title: 'Diputra Signature Indonesia – Legal, Visa, and Business Consulting in Bali',
  description: 'Professional legal, visa, and business consulting services based in Bali. Trusted by individuals and companies for transparent, reliable, and efficient solutions.',
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <div className="absolute top-0 left-1/2 -z-20 w-[1440px] -translate-x-1/2">
        <Image src={'/image/landing_page_building_paralax.webp'} alt="Diputra Signature Indonesia Building Home Paralax" width={1440} height={2794} className="w-full opacity-6" />
      </div>
      <AdvantageSection />
      <CtaSection />
      <ReviewSection />
      <ContactSection />
      <BlogSection />
    </>
  );
}
