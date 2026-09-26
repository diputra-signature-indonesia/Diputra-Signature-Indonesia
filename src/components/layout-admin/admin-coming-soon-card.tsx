import { Clock3 } from 'lucide-react';

type AdminComingSoonCardProps = {
  title: string;
  description: string;
};

export function AdminComingSoonCard({ title, description }: AdminComingSoonCardProps) {
  return (
    <main className="flex h-full min-h-0 flex-col bg-[#F8F9FB] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1C1E]">{title}</h1>
        <p className="mt-1 text-sm text-[#8C1010]">{description}</p>
      </div>

      <section className="flex min-h-[320px] flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="flex max-w-md flex-col items-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#8C1010]/10 text-[#8C1010]">
            <Clock3 aria-hidden="true" className="size-7" strokeWidth={1.7} />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8C1010]">Coming Soon</p>
          <h2 className="mt-2 text-xl font-semibold text-[#1A1C1E]">{title} sedang dipersiapkan</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">Halaman ini sudah tersedia dan akan dilengkapi pada pengembangan DSI versi 2 berikutnya.</p>
        </div>
      </section>
    </main>
  );
}
