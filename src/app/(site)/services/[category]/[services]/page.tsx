import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { category: string; service: string } }): Promise<Metadata> {
  const { category, service } = params;

  const formattedCategory = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const formattedService = service.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${formattedService} — ${formattedCategory} Services | Diputra Signature Indonesia`,
    description: `Detailed explanation of our ${formattedService.toLowerCase()} services within the ${formattedCategory.toLowerCase()} category, provided by our professional consultants in Bali.`,
  };
}

export default function ServicesDetailsPage({ params }: { params: { category: string; service: string } }) {
  return (
    <div>
      Service Detail Page
      <br />
      Category: {params.category}
      <br />
      Service: {params.service}
    </div>
  );
}
