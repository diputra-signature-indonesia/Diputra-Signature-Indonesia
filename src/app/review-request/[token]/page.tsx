// src/app/review-request/[token]/page.tsx
import ReviewRequestClient from '@/components/layout/review-request-client';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Leave a Review | Diputra Signature Indonesia',
  robots: { index: false, follow: false },
};

export default async function ReviewRequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // TODO: ganti ini dengan validasi token beneran (Supabase)
  const isValid = Boolean(token) && token.length > 10;
  const status: 'valid' | 'expired' | 'used' | 'invalid' = isValid ? 'valid' : 'invalid';

  return (
    <main className="bg-brand-white flex min-h-dvh flex-col items-center justify-center px-4 py-5">
      <div className="bg-brand-white w-full max-w-xl rounded-2xl border border-white/10 p-6 shadow-sm">
        <Image src="/image/diputra-signature-indonesia.jpeg" alt="Diputra Signature Indonesia" width={1200} height={480} priority className="mx-auto mb-5 h-auto w-4/5 rounded-2xl object-cover" />
        <ReviewRequestClient token={token} status={status} />
      </div>
    </main>
  );
}
