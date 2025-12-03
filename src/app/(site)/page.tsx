import { BlogSection } from '@/components/layout/section-blog';
import { ContactSection } from '@/components/layout/section-contact';
import { ServicesSection } from '@/components/layout/section-services';
import { ReviewSection } from '@/components/layout/section-review';
import { AdvantageSection } from '@/components/layout/section-advantage';
import { AboutSection } from '@/components/layout/section-about';
import { HeroSection } from '@/components/layout/section-home-hero';

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
      <AdvantageSection />
      <ReviewSection />
      <ContactSection />
      <BlogSection />
    </>
  );
}
