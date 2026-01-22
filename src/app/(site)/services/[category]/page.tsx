import { getPublishedBlogPosts, getServiceCategories, getServiceCategoryBySlug, getServiceItemsByCategorySlug } from '@/lib/supabase/queries';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryHeroSection } from '@/components/layout/category-hero-section';
import { CategoryServicesSection } from '@/components/layout/category-services-section';
import { BlogSection } from '@/components/layout/section-blog';
import { CtaSection } from '@/components/layout/section-cta';
import { QnaSection } from '@/components/layout/section-qna';
import { ServicesSection } from '@/components/layout/section-services';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;

  try {
    const cat = await getServiceCategoryBySlug(category);
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
      },
    };
  } catch {
    return {
      title: 'Services | Diputra Signature Indonesia',
      description: 'Explore our professional legal, visa, and business services in Bali.',
    };
  }
}

export default async function ServicesCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  let servicesSelected;
  try {
    servicesSelected = await getServiceCategoryBySlug(category);
  } catch {
    notFound();
  }
  const [blogPosts, ServicesCategory, servicesItems] = await Promise.all([getPublishedBlogPosts(3), getServiceCategories(), getServiceItemsByCategorySlug(category)]);
  return (
    <>
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
        <ServicesSection services={ServicesCategory} excludeSlug={category} />
      </div>
      <div className="w-full bg-white pt-13 drop-shadow-lg">
        <BlogSection blogPosts={blogPosts} />
      </div>
    </>
  );
}
