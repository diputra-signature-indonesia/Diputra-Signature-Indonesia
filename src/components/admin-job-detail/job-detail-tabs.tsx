import Link from 'next/link';

export type JobDetailTab = 'detail' | 'assignment' | 'logging';

const tabs: { id: JobDetailTab; label: string }[] = [
  { id: 'detail', label: 'Jobs Detail' },
  { id: 'assignment', label: 'Task Assignment' },
  { id: 'logging', label: 'Jobs Logging' },
];

export function JobDetailTabs({ jobId, activeTab }: { jobId: string; activeTab: JobDetailTab }) {
  return (
    <nav aria-label="Job detail navigation" className="flex overflow-x-auto border-b border-[#D9DDE3] bg-white px-4 sm:px-5 lg:px-8">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        const href = tab.id === 'detail' ? `/admin/all-jobs/${jobId}` : `/admin/all-jobs/${jobId}?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-12 shrink-0 items-center px-4 text-xs font-semibold transition ${active ? 'text-[#17243A]' : 'text-[#42516A] hover:text-[#8C1010]'}`}
          >
            {tab.label}
            {active ? <span className="absolute inset-x-0 bottom-0 h-px bg-[#F2C900]" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
