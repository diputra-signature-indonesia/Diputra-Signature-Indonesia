import { ServicesSection } from '@/components/layout/section-services';
import { getServiceCategories } from '@/lib/supabase/queries';

export const metadata = {
  title: 'Our Services | Diputra Signature Indonesia',
  description: 'Explore our comprehensive legal, visa, and business consulting services designed to support individuals and companies operating in Bali and throughout Indonesia.',
};

export default async function ServicesPage() {
  const categoryService = await getServiceCategories();
  return (
    <div className="my-10">
      <h1 id="services-heading" className="sr-only">
        Diputra Services
      </h1>
      <ServicesSection services={categoryService} />
    </div>
  );
}
