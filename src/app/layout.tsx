// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Raleway } from 'next/font/google';
import './globals.css';

export const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], // lengkap
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#800020', // brand burgundy
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), // Ini Disesuaikan
  title: {
    default: 'Diputra Signature Indonesia',
    template: '%s | Diputra Signature Indonesia',
  },
  description: 'Legal, immigration, and real estate consulting services with a professional, transparent, and integrity-based approach.', //1–2 kalimat “about” resmi yang mereka setuju (tone legal/corporate)
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon/icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/icon/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Diputra Signature Indonesia',
    title: 'Diputra Signature Indonesia',
    description: 'Legal, immigration, and real estate consulting services with a professional, transparent, and integrity-based approach.',
    images: [
      {
        url: '/og/og-default.png', // siapkan file ini di. /public/og/ logo versi terang/gelap + preferensi foto/visual (legal/visa/real estate vibe). ukuran HARUS 1200×630, aman text tidak kepotong, kontras bagus
        width: 1200,
        height: 630,
        alt: 'Diputra Signature Indonesia',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${raleway.variable}`}>
      <body>{children}</body>
    </html>
  );
}
