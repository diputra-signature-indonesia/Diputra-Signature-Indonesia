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
      description: 'Explore our services in Bali.',
    };
  }

  const data = SERVICES_CATEGORY[category as Category];

  return {
    title: `${data.hero.heading} Services | Diputra Signature Indonesia`,
    description: data.hero.short_description,
  };
}

export default async function ServicesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  if (!(category in SERVICES_CATEGORY)) notFound();

  const data = SERVICES_CATEGORY[category as Category];

  return (
    <>
      <CategoryHeroSection {...data.hero} />
      <CategoryServicesSection title={data.hero.heading} services={data.services} />
      <CtaSection />
      <QnaSection />
      <ServicesSection heading={data.hero.heading} />
      <BlogSection />
    </>
  );
}
