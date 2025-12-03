import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://diputrasingapore.com'; // ganti ke domain final

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin'], // larang Google crawler ke halaman admin
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
