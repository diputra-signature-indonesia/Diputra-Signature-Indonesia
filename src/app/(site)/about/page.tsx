import { AdvantageSection } from '@/components/layout/about-advantage-section';
import { HeroSection } from '@/components/layout/about-hero-section';
import { TeamSection } from '@/components/layout/about-team-section';
import { getVisibleTeamMembers } from '@/lib/supabase/queries';
import Image from 'next/image';

export const metadata = {
  title: 'About Us | Diputra Signature Indonesia',
  description:
    'Learn about Diputra Signature Indonesia, a Bali-based consulting firm specializing in legal, visa, and business advisory services with a commitment to transparency and professionalism.',
};

export default async function AboutPage() {
  const team = await getVisibleTeamMembers();
  return (
    <div className="relative">
      <div className="fixed top-[50px] -z-10 h-screen max-h-[800px] w-screen">
        <Image
          src="/image/about-hero-section.webp"
          alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
          fill
          priority
          sizes="100vw"
          className="-z-10 w-full object-cover object-[50%_30%] brightness-90 max-md:max-h-1/2 lg:h-full"
        />
        <div className="z-10 h-full w-full translate-y-2 bg-[linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,0.3)_30%,rgba(0,0,0,0)_100%)] max-md:max-h-1/2 lg:hidden" />
        <div className="absolute -z-20 h-full w-full bg-black" />
      </div>

      <HeroSection />
      {/* <CompanyOverviewSection /> */}
      <div className="bg-brand-white pt-14 shadow-2xl">
        <AdvantageSection />
        <TeamSection team={team} />
      </div>
    </div>
  );
}
