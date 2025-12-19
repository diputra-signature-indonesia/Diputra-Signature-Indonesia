import { HeroSection } from '@/components/layout/about-hero-section';
import { AdvantageSection } from '@/components/layout/about-advantage-section';
import { CompanyOverviewSection } from '@/components/layout/about-approach-section';
import { TeamSection } from '@/components/layout/about-team-section';

export const metadata = {
  title: 'About Us | Diputra Signature Indonesia',
  description:
    'Learn about Diputra Signature Indonesia, a Bali-based consulting firm specializing in legal, visa, and business advisory services with a commitment to transparency and professionalism.',
};

export default function AboutPage() {
  return (
    <>
      <HeroSection />
      {/* <CompanyOverviewSection /> */}
      <AdvantageSection />
      <TeamSection />
    </>
  );
}
