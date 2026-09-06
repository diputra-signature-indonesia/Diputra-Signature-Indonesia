// src/app/review-request/[token]/page.tsx
import ReviewRequestClient from '@/components/layout/review-request-client';
import type { Metadata } from 'next';
import Image from 'next/image';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { getReviewRequestStatusAction } from './actions';

export const metadata: Metadata = {
  title: 'Leave a Review | Diputra Signature Indonesia',
  robots: { index: false, follow: false },
};

type ReviewRequestPageProps = {
  params: Promise<{ token: string }>;
};

export default function ReviewRequestPage(props: ReviewRequestPageProps) {
  return (
    <Suspense fallback={null}>
      <DynamicReviewRequestPage {...props} />
    </Suspense>
  );
}

async function DynamicReviewRequestPage({ params }: ReviewRequestPageProps) {
  await connection();
  const { token } = await params;

  const status = await getReviewRequestStatusAction(token);

  return (
    <main className="bg-brand-white flex min-h-dvh flex-col items-center justify-center px-4 py-5">
      <div className="bg-brand-white w-full max-w-xl rounded-2xl border border-white/10 p-6 shadow-sm">
        <Image src="/icon/dsi-logo.png" alt="Diputra Signature Indonesia" width={1200} height={480} priority className="mx-auto mb-5 h-auto w-4/5 rounded-2xl object-cover" />
        <ReviewRequestClient token={token} status={status} />
      </div>
    </main>
  );
}
