import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SERVICES_CATEGORY } from '@/data/dsi-services';
import { CategoryHeroSection } from '@/components/layout/category-hero-section';
import { CategoryServicesSection } from '@/components/layout/category-services-section';
import { Category } from '@/types/dsi-services';
import { BlogSection } from '@/components/layout/section-blog';
import { CtaSection } from '@/components/layout/section-cta';
import { QnaSection } from '@/components/layout/section-qna';
import { ServicesSection } from '@/components/layout/section-services';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;

  if (!(category in SERVICES_CATEGORY)) {
    return {
      title: 'Services | Diputra Signature Indonesia',
      description: 'Explore our professional legal, visa, and business services in Bali.',
    };
  }

  const data = SERVICES_CATEGORY[category as Category];

  return {
    title: `${data.hero.heading} Services in Bali | Diputra Signature Indonesia`,
    description: data.hero.short_description,
    alternates: {
      canonical: `/services/${category}`,
    },
    openGraph: {
      title: `${data.hero.heading} Services in Bali`,
      description: data.hero.short_description,
      type: 'website',
      url: `/services/${category}`,
    },
  };
}

export default async function ServicesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  if (!(category in SERVICES_CATEGORY)) notFound();

  const data = SERVICES_CATEGORY[category as Category];

  return (
    <>
      <CategoryHeroSection {...data.hero} />
      <CategoryServicesSection categorySlug={category} title={data.hero.heading} short_description={data.hero.short_description} services={data.services} />
      <CtaSection heading="Request a Consultation" description="Start Your Legal Process Today" />
      <QnaSection />
      <div className="pb-13">
        <ServicesSection excludeSlug={category} />
      </div>
      <div className="w-full bg-white pt-13 drop-shadow-lg">
        <BlogSection />
      </div>
    </>
  );
}
