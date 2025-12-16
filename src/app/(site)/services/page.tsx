import { ServicesSection } from '@/components/layout/section-services';

export const metadata = {
  title: 'Our Services | Diputra Signature Indonesia',
  description: 'Explore our comprehensive legal, visa, and business consulting services designed to support individuals and companies operating in Bali and throughout Indonesia.',
};

export default function ServicesPage() {
  return (
    <div className="my-10">
      <ServicesSection />
    </div>
  );
}
