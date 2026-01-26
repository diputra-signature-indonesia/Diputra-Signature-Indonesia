import { getPublishedBlogPosts, getServiceCategories, getVisibleStories } from '@/lib/supabase/queries';
import type { Metadata } from 'next';

import { AboutSection } from '@/components/layout/home-about-section';
import { HeroSection } from '@/components/layout/home-hero-section';
import { BlogSection } from '@/components/layout/section-blog';
import { ContactSection } from '@/components/layout/section-contact';
import { ReviewSection } from '@/components/layout/section-review';
import { ServicesSection } from '@/components/layout/section-services';

export const metadata: Metadata = {
  title: 'Legal, Visa, and Business Consulting in Bali',
  description: 'Professional legal, visa, and business consulting services based in Bali. Trusted by individuals and companies for transparent, reliable, and efficient solutions.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Diputra Signature Indonesia – Legal, Visa, and Business Consulting in Bali',
    description: 'Professional legal, visa, and business consulting services based in Bali. Trusted by individuals and companies for transparent, reliable, and efficient solutions.',
    url: '/',
    images: ['/og/og-default.png'],
  },
};

export default async function HomePage() {
  const [categoryService, blogPosts, review] = await Promise.all([getServiceCategories(), getPublishedBlogPosts(3), getVisibleStories()]);
  return (
    <>
      <div className="relative mx-auto max-w-[1440px] overflow-x-hidden">
        {/* <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/image/landing_page_building_paralax.webp')] bg-cover bg-top bg-no-repeat opacity-5" /> */}
        <div className="relative z-10">
          <HeroSection />
          <ServicesSection services={categoryService} />
          <div className="relative">
            <div className="via-brand-white to-brand-white pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-white/0" />
            <AboutSection />
          </div>
        </div>
      </div>
      <div className="relative mx-auto max-w-[1440px]">
        {/* <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/image/writing_with_red_pen.webp')] bg-cover bg-position-[50%_70%] bg-no-repeat opacity-10" /> */}
        <div className="relative z-10">
          <div className="via-brand-white to-brand-white pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-white/0" />
          <ReviewSection testimonials={review} />
        </div>
        <div className="mt-30 max-md:mb-10">
          <BlogSection blogPosts={blogPosts} />
        </div>
      </div>
      <div className="w-full pt-13 pb-30 drop-shadow-lg">
        <ContactSection />
      </div>
    </>
  );
}
