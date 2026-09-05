import { getPublishedBlogPosts, getServiceCategories, getServiceCategoryPageData } from '@/lib/supabase/queries';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryHeroSection } from '@/components/layout/category-hero-section';
import { CategoryServicesSection } from '@/components/layout/category-services-section';
import { BlogSection } from '@/components/layout/section-blog';
import { CtaSection } from '@/components/layout/section-cta';
import { QnaSection } from '@/components/layout/section-qna';
import { ServicesSection } from '@/components/layout/section-services';
import { MotionProvider } from '@/components/motion';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const pageData = await getServiceCategoryPageData(category);

  if (!pageData) notFound();

  const { category: cat } = pageData;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://diputrasignature.com';
  return {
    title: `${cat.seo_title ?? cat.title} Services in Bali | Diputra Signature Indonesia`,
    description: cat.seo_description ?? cat.description,
    alternates: { canonical: `${baseUrl}/services/${category}` },
    openGraph: {
      title: `${cat.seo_title ?? cat.title} Services in Bali`,
      description: cat.short_description ?? '',
      type: 'website',
      url: `${baseUrl}/services/${category}`,
      images: ['/og/og-default.png'],
    },
  };
}

export default async function ServicesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  const [servicePageData, blogPosts, serviceCategories] = await Promise.all([getServiceCategoryPageData(category), getPublishedBlogPosts(3), getServiceCategories()]);

  if (!servicePageData) notFound();

  const { category: servicesSelected, items: servicesItems } = servicePageData;

  return (
    <MotionProvider>
      <CategoryHeroSection
        heading={servicesSelected.hero_heading ?? servicesSelected.title ?? ''}
        image={servicesSelected.hero_image ?? ''}
        description={servicesSelected.description ?? ''}
        short_description={servicesSelected.short_description ?? ''}
      />
      <CategoryServicesSection
        categorySlug={category}
        title={servicesSelected.hero_heading ?? servicesSelected.title ?? ''}
        short_description={servicesSelected.short_description ?? ''}
        services={servicesItems}
      />
      <CtaSection heading="Request a Consultation" description="Start Your Legal Process Today" />
      <QnaSection />
      <div className="pb-13">
        <ServicesSection services={serviceCategories} excludeSlug={category} />
      </div>
      <div className="w-full bg-white pt-13 pb-28 drop-shadow-lg">
        <BlogSection blogPosts={blogPosts} />
      </div>
    </MotionProvider>
  );
}
