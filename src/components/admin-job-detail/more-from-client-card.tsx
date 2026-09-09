'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import { relatedClientJobs, type RelatedClientJob } from '@/data/admin-job-detail/job-detail-dummy-data';
import { Search } from 'lucide-react';
import { useState } from 'react';

function RelatedJobItem({ job }: { job: RelatedClientJob }) {
  return (
    <article className="border-b border-[#E3E5E8] px-4 py-3">
      <p className="truncate text-sm font-medium text-[#2A2020]">{job.title}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-[10px] ${job.urgent ? 'text-red-600' : 'text-[#2A2020]'}`}>{job.daysLabel}</span>
        <div className="flex gap-1.5">
          <span className="inline-flex items-center gap-1 rounded bg-[#FFDADA] px-2 py-1 text-[8px] font-semibold uppercase text-[#C32929]"><span className="size-1 rounded-full bg-current" />{job.priority}</span>
          <span className="inline-flex items-center gap-1 rounded border border-[#194DB8] bg-[#EAF1FF] px-2 py-1 text-[8px] font-semibold uppercase text-[#073A98]"><span className="size-1 rounded-full bg-current" />{job.status}</span>
        </div>
      </div>
    </article>
  );
}

export function MoreFromClientCard() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleJobs = normalizedQuery ? relatedClientJobs.filter((job) => job.title.toLowerCase().includes(normalizedQuery)) : relatedClientJobs;

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <header className="px-4 pt-4 pb-3">
          <h2 className="text-xl font-semibold text-[#2A2020]">More from this Client</h2>
          <label className="relative mt-3 block">
            <span className="sr-only">Search this client jobs</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#788495]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Job title, client name, or reference..."
              className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] pr-3 pl-9 text-xs text-[#303846] outline-none transition placeholder:text-[#747D8C] focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10"
            />
          </label>
        </header>

        <div className="max-h-56 overflow-y-auto border-t border-[#E3E5E8]">
          {visibleJobs.map((job) => <RelatedJobItem key={job.id} job={job} />)}
          {visibleJobs.length === 0 ? <p className="px-4 py-10 text-center text-xs text-[#8A94A3]">Job tidak ditemukan.</p> : null}
        </div>

        <button type="button" onClick={() => setIsOpen(true)} className="flex h-11 w-full items-center justify-center border-t border-[#E3E5E8] text-xs font-semibold text-[#8C1010] transition hover:bg-[#FFF6F6]">
          View All Jobs
        </button>
      </section>

      <AdminModal open={isOpen} onClose={() => setIsOpen(false)} title="All Client Jobs" description="All other jobs registered for PT Sunji Bakti Inc." size="lg">
        <div className="overflow-hidden rounded-xl border border-[#E3E5E8]">
          {relatedClientJobs.map((job) => <RelatedJobItem key={job.id} job={job} />)}
        </div>
      </AdminModal>
    </>
  );
}
