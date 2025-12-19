import type { Metadata } from 'next';
import { BlogSection } from '@/components/layout/section-blog';
import { ContactSection } from '@/components/layout/section-contact';
import { ServicesSection } from '@/components/layout/section-services';
import { ReviewSection } from '@/components/layout/section-review';
import { HeroSection } from '@/components/layout/home-hero-section';
import { AboutSection } from '@/components/layout/home-about-section';

export const metadata: Metadata = {
  title: 'Legal, Visa, and Business Consulting in Bali',
  description: 'Professional legal, visa, and business consulting services based in Bali. Trusted by individuals and companies for transparent, reliable, and efficient solutions.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Diputra Signature Indonesia – Legal, Visa, and Business Consulting in Bali',
    description: 'Professional legal, visa, and business consulting services based in Bali. Trusted by individuals and companies for transparent, reliable, and efficient solutions.',
    url: '/',
    images: ['/og/og-default.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/og-default.jpg'],
  },
};

export default function HomePage() {
  return (
    <>
      <div className="relative mx-auto max-w-[1440px]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/image/landing_page_building_paralax.webp')] bg-cover bg-top bg-no-repeat opacity-5" />
        <div className="relative z-10">
          <HeroSection />
          <ServicesSection />
          <div className="relative">
            <div className="via-brand-white to-brand-white pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-white/0" />
            <AboutSection />
          </div>
        </div>
      </div>
      <div className="relative mx-auto max-w-[1440px] pb-30">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/image/writing_with_red_pen.webp')] bg-cover bg-position-[50%_70%] bg-no-repeat opacity-10" />
        <div className="relative z-10">
          <div className="via-brand-white to-brand-white pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-white/0" />
          <ReviewSection />
        </div>
        <div className="mt-30">
          <ContactSection />
        </div>
      </div>
      <div className="w-full bg-white pt-13 drop-shadow-lg">
        <BlogSection />
      </div>
    </>
  );
}
