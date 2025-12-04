import { HeroSection } from '@/components/layout/section-about-hero';
import { CompanyOverviewSection } from '@/components/layout/section-company-overview';
import { TeamSection } from '@/components/layout/team-section';

export const metadata = {
  title: 'About Us | Diputra Signature Indonesia',
  description:
    'Learn about Diputra Signature Indonesia, a Bali-based consulting firm specializing in legal, visa, and business advisory services with a commitment to transparency and professionalism.',
};

export default function AboutPage() {
  return (
    <>
      <HeroSection />
      <CompanyOverviewSection />
      <TeamSection />
    </>
  );
}
