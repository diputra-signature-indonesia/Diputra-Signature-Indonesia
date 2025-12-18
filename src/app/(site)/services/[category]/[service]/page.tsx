import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SERVICES_CATEGORY } from '@/data/dsi-services';
import type { Category, ServiceItem } from '@/types/dsi-services';
import { DetailServiceSection } from '@/components/layout/detail-service-section';
import { CtaSection } from '@/components/layout/section-cta';
import { QnaSection } from '@/components/layout/section-qna';
import { ServicesSection } from '@/components/layout/section-services';
import { BlogSection } from '@/components/layout/section-blog';

type PageProps = {
  params: {
    category: string;
    service: string;
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, service } = await params;

  if (!(category in SERVICES_CATEGORY)) {
    notFound();
  }

  const categoryData = SERVICES_CATEGORY[category as Category];
  const serviceData: ServiceItem | undefined = categoryData.services.find((item) => item.slug === service);

  if (!serviceData) {
    notFound();
  }

  return {
    title: `${serviceData.title} | ${categoryData.hero.heading} Services`,
    description: serviceData.description,
  };
}

export default async function ServicesDetailsPage({ params }: { params: { category: string; service: string } }) {
  const { category, service } = await params;
  if (!(category in SERVICES_CATEGORY)) notFound();
  const categoryData = SERVICES_CATEGORY[category as Category];
  const serviceData: ServiceItem | undefined = categoryData.services.find((item) => item.slug === service);
  if (!serviceData) notFound();

  return (
    <>
      <DetailServiceSection categoryTitle={categoryData.hero.heading} serviceTitle={serviceData.title} serviceDescription={serviceData.description} servicesDetail={serviceData.services_detail} />
      <CtaSection heading="Didn’t find what you need?" description="Some legal and corporate matters require personalized guidance." />
      <QnaSection />
      <div className="pb-13">
        <ServicesSection heading={categoryData.hero.heading} />
      </div>
      <div className="w-full bg-white pt-13 drop-shadow-lg">
        <BlogSection />
      </div>
    </>
  );
}
