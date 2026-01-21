// src/lib/schema-dsi.ts
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL; // ganti ke domain final
const ORG_NAME = 'Diputra Signature Indonesia';
type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// Helper kecil: buang field undefined/null/string kosong biar JSON-LD bersih
function cleanJsonLd<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;

    if (Array.isArray(v)) {
      const arr = v.map((x) => (typeof x === 'object' && x !== null ? cleanJsonLd(x) : x)).filter((x) => x !== undefined && x !== null && !(typeof x === 'string' && x.trim() === ''));
      if (arr.length === 0) continue;
      out[k] = arr;
      continue;
    }

    if (typeof v === 'object') {
      const nested = cleanJsonLd(v);
      // kalau nested kosong, skip
      if (nested && Object.keys(nested).length === 0) continue;
      out[k] = nested;
      continue;
    }

    out[k] = v;
  }
  return out;
}
/*
Kalau kamu mau schema ini benar-benar kuat, minta ini:
alamat kantor lengkap + kode pos
nomor telepon/WA resmi (format +62…)
email resmi (biasanya info@domain)
link Google Business Profile / Maps (kalau ada)
jam operasional termasuk Sabtu/Minggu (kalau buka)
logo final path publik
*/
export const dsiLocalBusinessJsonLd = cleanJsonLd({
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService', // TODO: bisa diganti ke LegalService, ImmigrationConsultant, dll nanti
  '@id': `${baseUrl}/#organization`, // ID unik untuk entity (bagus untuk konsistensi)
  name: ORG_NAME,
  url: baseUrl, // TODO: ganti ke domain resmi DSI
  description: 'Legal, immigration, and real estate consulting services in Bali with a professional, transparent, and integrity-based approach.',
  logo: `${baseUrl}/images/logo-dsi.png`, // TODO: pastikan file bener & publik
  image: [`${baseUrl}/og/og-default.jpg`], // saran: pakai OG default yang sama
  // Kontak (isi yang resmi)
  telephone: '+62811234567890', // TODO
  email: 'DSIInfo@diputraSignature.com', // TODO
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+62...', // TODO
      contactType: 'customer service',
      areaServed: ['ID'],
      availableLanguage: ['English', 'Indonesian'],
    },
  ],
  //  Area layanan
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Bali' },
    { '@type': 'Country', name: 'Indonesia' },
  ],
  serviceType: ['Legal Consulting', 'Immigration & Visa Services', 'Real Estate Consulting'],

  // ✅ Katalog layanan (opsional tapi bagus untuk struktur)
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Services',
    itemListElement: [
      {
        '@type': 'OfferCatalog',
        name: 'Visa & Immigration',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Visa Assistance' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'KITAS / KITAP' } },
        ],
      },
      {
        '@type': 'OfferCatalog',
        name: 'Legal',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Agreement Drafting & Review' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Business Licensing (OSS)' } },
        ],
      },
      {
        '@type': 'OfferCatalog',
        name: 'Real Estate',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Property Due Diligence' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Leasehold / Freehold Advisory' } },
        ],
      },
    ],
  },

  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[],
      opens: '09:00',
      closes: '17:00',
    },
  ],
  address: {
    // TODO: Harus ASLI (prinsip: lebih baik kurang daripada salah)
    '@type': 'PostalAddress',
    streetAddress: '', // TODO
    addressLocality: 'Denpasar', // contoh, TODO
    addressRegion: 'Bali',
    postalCode: '80xxx',
    addressCountry: 'ID',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -8.65, // TODO
    longitude: 115.21, // TODO
  },
  // Social proof / entity linking
  sameAs: [
    // TODO: isi kalau ada
    // 'https://www.instagram.com/...',
    // 'https://www.linkedin.com/company/...',
    // 'https://g.page/r/....' (Google Business Profile / Maps share link)
  ],
});

export interface DsiBlogPostSchemaInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  description?: string | null;
  date?: string | null; // ISO string
  updatedAt?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
}

export function buildDsiBlogPostingJsonLd(post: DsiBlogPostSchemaInput) {
  const url = `${baseUrl}/blog/${post.slug}`;

  return cleanJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: post.title,
    description: post.excerpt || post.description || undefined,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    inLanguage: 'en', // nanti bisa dinamis jika bilingual
    author: {
      '@type': 'Organization',
      name: ORG_NAME,
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/logo-dsi.png`,
      },
    },
    datePublished: post.date,
    dateModified: post.updatedAt || post.date,
  });
}
