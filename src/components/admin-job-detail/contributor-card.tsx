'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import { jobContributors, type JobContributor } from '@/data/admin-job-detail/job-detail-dummy-data';
import { useState } from 'react';

function ContributorItem({ contributor }: { contributor: JobContributor }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#A91217] text-xs font-semibold text-white">{contributor.initials}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#2A2020]">{contributor.name}</span>
      {contributor.role ? <span className="text-[10px] uppercase tracking-[0.08em] text-[#A91217]">{contributor.role}</span> : null}
    </div>
  );
}

export function ContributorCard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <header className="border-b border-[#E3E5E8] px-4 py-4">
          <h2 className="text-xl font-semibold text-[#2A2020]">Contributor</h2>
          <p className="mt-1 text-xs text-[#695E5C]">People involved in this job&apos;s tasks.</p>
        </header>
        <div>
          {jobContributors.slice(0, 3).map((contributor) => <ContributorItem key={contributor.id} contributor={contributor} />)}
        </div>
        <button type="button" onClick={() => setIsOpen(true)} className="flex h-11 w-full items-center justify-center text-xs font-semibold text-[#8C1010] transition hover:bg-[#FFF6F6]">
          View More
        </button>
      </section>

      <AdminModal open={isOpen} onClose={() => setIsOpen(false)} title="All Contributors" description="People involved in this job and its assigned tasks.">
        <div className="divide-y divide-[#E7E9ED]">
          {jobContributors.map((contributor) => <ContributorItem key={contributor.id} contributor={contributor} />)}
        </div>
      </AdminModal>
    </>
  );
}
