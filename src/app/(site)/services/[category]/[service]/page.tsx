import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedBlogPosts, getServiceCategories, getServiceDetailPageData } from '@/lib/supabase/queries';

import { DetailServiceSection } from '@/components/layout/detail-service-section';
import { CtaSection } from '@/components/layout/section-cta';
import { QnaSection } from '@/components/layout/section-qna';
import { ServicesSection } from '@/components/layout/section-services';
import { BlogSection } from '@/components/layout/section-blog';

export async function generateMetadata({ params }: { params: Promise<{ category: string; service: string }> }): Promise<Metadata> {
  const { category, service } = await params;

  try {
    const selectedService = await getServiceDetailPageData(category, service);
    return {
      title: `${selectedService.item.seo_title} in Bali | ${selectedService.category.seo_title} Services`,
      description: selectedService.item.seo_description,
      alternates: { canonical: `/services/${category}/${service}` },
      openGraph: {
        title: `${selectedService.item.title} Services in Bali`,
        description: selectedService.item.description ?? '',
        type: 'article',
        url: `/services/${category}/${service}`,
      },
    };
  } catch {
    return {
      title: 'Services | Diputra Signature Indonesia',
      description: 'Explore our professional legal, visa, and business services in Bali.',
    };
  }
}

export default async function ServicesDetailsPage({ params }: { params: Promise<{ category: string; service: string }> }) {
  const { category, service } = await params;

  let servicesDetail;
  try {
    servicesDetail = await getServiceDetailPageData(category, service);
  } catch {
    notFound();
  }

  const [blogPosts, ServicesCategory] = await Promise.all([getPublishedBlogPosts(3), getServiceCategories()]);
  return (
    <>
      <DetailServiceSection
        categoryTitle={servicesDetail.category.title ?? ''}
        serviceTitle={servicesDetail.item.title ?? ''}
        serviceDescription={servicesDetail.item.description ?? ''}
        servicesDetail={servicesDetail.details}
      />
      <CtaSection heading="Didn’t find what you need?" description="Some legal and corporate matters require personalized guidance." />
      <QnaSection />
      <div className="pb-13">
        <ServicesSection services={ServicesCategory} excludeSlug={category} />
      </div>
      <div className="w-full bg-white pt-13 drop-shadow-lg">
        <BlogSection blogPosts={blogPosts} />
      </div>
    </>
  );
}
