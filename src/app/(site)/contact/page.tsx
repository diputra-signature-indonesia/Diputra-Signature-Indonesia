import { ContactSection } from '@/components/layout/section-contact';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with our legal, visa, and business consulting team in Bali for professional support and clear guidance.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us | Diputra Signature Indonesia',
    description: 'Get in touch with our legal, visa, and business consulting team in Bali for professional support and clear guidance.',
    url: '/contact',
    images: [
      {
        url: '/og/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Contact Us | Diputra Signature Indonesia',
      },
    ],
  },
};

export default function ContactPage() {
  return (
    <div className="my-20">
      <ContactSection />
    </div>
  );
}
