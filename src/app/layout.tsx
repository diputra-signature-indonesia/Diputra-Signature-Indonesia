// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Raleway } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/site-config';

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // Ini Disesuaikan
  title: {
    default: 'Diputra Signature Indonesia',
    template: '%s | Diputra Signature Indonesia',
  },
  description: 'Legal, immigration, and real estate consulting services with a professional, transparent, and integrity-based approach.', //1–2 kalimat “about” resmi yang mereka setuju (tone legal/corporate)
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Diputra Signature Indonesia',
    title: 'Diputra Signature Indonesia',
    description: 'Legal, immigration, and real estate consulting services with a professional, transparent, and integrity-based approach.',
    images: [
      {
        url: '/og/og-default.jpg', // siapkan file ini di. /public/og/ logo versi terang/gelap + preferensi foto/visual (legal/visa/real estate vibe). ukuran HARUS 1200×630, aman text tidak kepotong, kontras bagus
        width: 1200,
        height: 630,
        alt: 'Diputra Signature Indonesia',
        // Contoh pilihan preferensi (biar kebayang)
        // Opsi A — Corporate & Clean (paling aman)
        // Background polos / gradient maroon
        // Logo DSI
        // Tagline singkat
        // Tanpa foto orang
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Diputra Signature Indonesia',
    description: 'Legal, immigration, and real estate consulting services with a professional, transparent, and integrity-based approach.',
    images: ['/og/og-default.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  // icons: {
  //   icon: [
  //     { url: '/favicon.ico' }, //minimal ada: favicon.ico, apple-touch-icon.png (180×180), icon-32.png, icon-16.png
  //     { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
  //     { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
  //   ],
  //   apple: [{ url: '/icons/apple-touch-icon.png' }],
  // },
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
