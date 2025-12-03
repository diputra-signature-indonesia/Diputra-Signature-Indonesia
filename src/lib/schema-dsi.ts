// src/lib/schema-dsi.ts
const baseUrl = 'https://diputrasingapore.com'; // ganti ke domain final

export const dsiLocalBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService', // TODO: bisa diganti ke LegalService, ImmigrationConsultant, dll nanti
  name: 'Diputra Signature Indonesia',
  url: baseUrl, // TODO: ganti ke domain resmi DSI
  logo: `${baseUrl}/images/logo-dsi.png`, // TODO: ganti kalau sudah ada
  image: [`${baseUrl}/images/og-image.png`],
  telephone: '+62811234567890', // TODO: samakan dengan yang resmi
  email: 'DSIInfo@diputraSignature.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Jl. Contoh No. 123', // ganti
    addressLocality: 'Denpasar',
    addressRegion: 'Bali',
    postalCode: '80000',
    addressCountry: 'ID',
  },
  // kalau ada koordinat, bisa diisi
  // geo: {
  //   '@type': 'GeoCoordinates',
  //   latitude: -8.6705,
  //   longitude: 115.2126,
  // },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '17:00',
    },
  ],
  sameAs: [
    // isi kalau ada
    // 'https://www.instagram.com/...',
    // 'https://www.linkedin.com/company/...',
  ],
};

export interface DsiBlogPostSchemaInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  description?: string | null;
  date: string; // ISO string
  updatedAt?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
}

export function buildDsiBlogPostingJsonLd(post: DsiBlogPostSchemaInput) {
  const url = `${baseUrl}/blog/${post.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: post.title,
    description: post.excerpt || post.description || undefined,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    author: {
      '@type': 'Person',
      name: post.authorName || 'Diputra Signature Indonesia',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Diputra Signature Indonesia',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/logo-dsi.png`,
      },
    },
    datePublished: post.date,
    dateModified: post.updatedAt || post.date,
  };
}
