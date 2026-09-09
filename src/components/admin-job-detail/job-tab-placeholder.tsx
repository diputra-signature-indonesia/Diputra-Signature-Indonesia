import type { JobDetailTab } from './job-detail-tabs';

const content: Record<Exclude<JobDetailTab, 'detail'>, { title: string; description: string }> = {
  assignment: {
    title: 'Task Assignment',
    description: 'Pengelolaan assignment untuk job ini akan tersedia pada tahap berikutnya.',
  },
  logging: {
    title: 'Jobs Logging',
    description: 'Riwayat aktivitas lengkap untuk job ini akan tersedia pada tahap berikutnya.',
  },
};

export function JobTabPlaceholder({ tab }: { tab: Exclude<JobDetailTab, 'detail'> }) {
  const item = content[tab];

  return (
    <div className="px-4 py-5 sm:px-5 lg:px-6">
      <section className="flex min-h-72 items-center justify-center rounded-xl border border-[#D9DDE3] bg-white px-6 py-12 text-center shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8C1010]">Coming Soon</p>
          <h2 className="mt-2 text-xl font-semibold text-[#202938]">{item.title}</h2>
          <p className="mt-2 text-sm text-[#707988]">{item.description}</p>
        </div>
      </section>
    </div>
  );
}
