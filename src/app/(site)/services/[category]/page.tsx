import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const category = params.category; // misalnya "visa", "legal"

  // Format agar lebih manusiawi → "Visa", "Real Estate", dsb.
  const formatted = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${formatted} Services | Diputra Signature Indonesia`,
    description: `Learn more about our ${formatted.toLowerCase()} services in Bali, including professional support, documentation, compliance, and consulting.`,
  };
}

export default function ServicesCategoryPage({ params }: { params: { category: string } }) {
  return <div>Services Category Page (category: {params.category})</div>;
}
