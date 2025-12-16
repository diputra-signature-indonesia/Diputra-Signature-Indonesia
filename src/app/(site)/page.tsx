import { BlogSection } from '@/components/layout/section-blog';
import { ContactSection } from '@/components/layout/section-contact';
import { ServicesSection } from '@/components/layout/section-services';
import { ReviewSection } from '@/components/layout/section-review';
import { AdvantageSection } from '@/components/layout/section-advantage';
import { HeroSection } from '@/components/layout/section-home-hero';
import { AboutSection } from '@/components/layout/home-about-section';
import { CtaSection } from '@/components/layout/section-cta';

export const metadata = {
  title: 'Diputra Signature Indonesia – Legal, Visa, and Business Consulting in Bali',
  description: 'Professional legal, visa, and business consulting services based in Bali. Trusted by individuals and companies for transparent, reliable, and efficient solutions.',
};

export default function HomePage() {
  return (
    <>
      <div className="relative mx-auto max-w-[1440px]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/image/landing_page_building_paralax.webp')] bg-cover bg-top bg-no-repeat opacity-5" />
        <div className="relative z-10">
          <HeroSection />
          <AboutSection />
          <div className="mt-30">
            <ServicesSection />
          </div>
        </div>
      </div>
      {/* <div className="bg-brand-white relative">
        <img src="/linecurve.svg" alt="diputra signature indonesia line decoration" className="absolute size-full opacity-75" />
        <AdvantageSection />
      </div> */}
      {/* <CtaSection /> */}
      <div className="relative mx-auto max-w-[1440px]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/image/writing_with_red_pen.webp')] bg-cover bg-top bg-no-repeat opacity-10" />
        <div className="relative z-10">
          <ReviewSection />
          <div className="mt-30">
            <ContactSection />
          </div>
        </div>
      </div>
      <BlogSection />
    </>
  );
}
