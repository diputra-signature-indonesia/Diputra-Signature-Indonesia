import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SERVICES_CATEGORY } from '@/data/dsi-services';
import type { Category, ServiceItem } from '@/types/dsi-services';

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

  return <div>{serviceData.title}</div>;
}
