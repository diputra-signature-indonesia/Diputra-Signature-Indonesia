import { AdvantageSection } from '@/components/layout/about-advantage-section';
import { HeroSection } from '@/components/layout/about-hero-section';
import { TeamSection } from '@/components/layout/about-team-section';
import { MotionProvider } from '@/components/motion';
import { getVisibleTeamMembers } from '@/lib/supabase/queries';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Diputra Signature Indonesia, a Bali-based consulting firm specializing in legal, visa, and business advisory services with a commitment to transparency and professionalism.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Us | Diputra Signature Indonesia',
    description:
      'Learn about Diputra Signature Indonesia, a Bali-based consulting firm specializing in legal, visa, and business advisory services with a commitment to transparency and professionalism.',
    url: '/about',
    images: [
      {
        url: '/og/og-default.png',
        width: 1200,
        height: 630,
        alt: 'About Us | Diputra Signature Indonesia',
      },
    ],
  },
};

export default async function AboutPage() {
  const team = await getVisibleTeamMembers();
  return (
    <MotionProvider>
      <div className="relative">
        <HeroSection />
        {/* <CompanyOverviewSection /> */}
        <div className="bg-brand-white pt-14 shadow-2xl">
          <AdvantageSection />
          <TeamSection team={team} />
        </div>
      </div>
    </MotionProvider>
  );
}
