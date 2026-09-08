import { BrandButton } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

const CONTENT: Record<AccessRequestStatus, { title: string; description: string; badge: string }> = {
  pending: {
    title: 'Permintaan akses sedang ditinjau',
    description: 'Akun Google Anda sudah tercatat. Super admin perlu memilih role dan menyetujui akses sebelum Anda dapat membuka dashboard.',
    badge: 'Pending',
  },
  approved: {
    title: 'Akses telah disetujui',
    description: 'Silakan login kembali dengan akun Google yang sama untuk membuka dashboard admin.',
    badge: 'Approved',
  },
  rejected: {
    title: 'Permintaan akses ditolak',
    description: 'Akun ini belum mendapat akses ke dashboard. Hubungi super admin jika Anda memerlukan informasi lebih lanjut.',
    badge: 'Rejected',
  },
};

function parseStatus(value: string | undefined): AccessRequestStatus {
  return value === 'approved' || value === 'rejected' ? value : 'pending';
}

type AccessRequestPageProps = { searchParams: Promise<{ status?: string }> };

export default function AccessRequestPage(props: AccessRequestPageProps) {
  return (
    <Suspense fallback={null}>
      <DynamicAccessRequestPage {...props} />
    </Suspense>
  );
}

async function DynamicAccessRequestPage({ searchParams }: AccessRequestPageProps) {
  await connection();
  const { status: rawStatus } = await searchParams;
  const status = parseStatus(rawStatus);
  const content = CONTENT[status];
  const badgeClasses = status === 'approved' ? 'bg-green-100 text-green-700' : status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';

  return (
    <main className="font-raleway flex min-h-dvh items-center justify-center bg-neutral-50 px-6 py-12">
      <section className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
        <Image alt="Diputra Signature Indonesia" src="/icon/dsi-logo.png" width={240} height={120} className="mx-auto mb-8 h-auto w-52 object-contain" priority />
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses}`}>{content.badge}</span>
        <h1 className="mt-5 text-2xl font-semibold text-neutral-900">{content.title}</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">{content.description}</p>
        <p className="mt-4 text-xs text-neutral-500">Sesi Anda telah diakhiri. Approval tidak memerlukan perubahan pada akun Google.</p>
        <BrandButton asChild variant="red" className="mt-8 justify-center">
          <Link href="/login">Kembali ke login</Link>
        </BrandButton>
      </section>
    </main>
  );
}
