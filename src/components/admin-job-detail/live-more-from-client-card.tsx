'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { AllJob } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function RelatedJobItem({ job }: { job: AllJob }) {
  return <article className="border-b border-[#E3E5E8] px-4 py-3"><Link href={`/admin/all-jobs/${job.id}`} className="block truncate text-sm font-medium text-[#2A2020] hover:text-[#8C1010]">{job.title}</Link><div className="mt-3 flex items-center justify-between gap-2"><span className={`text-[10px] ${job.deadlineNote.startsWith('Overdue') ? 'text-red-600' : 'text-[#2A2020]'}`}>{job.deadlineNote}</span><div className="flex gap-1.5"><span className="rounded bg-[#FFDADA] px-2 py-1 text-[8px] font-semibold uppercase text-[#C32929]">{job.priority}</span><span className="rounded border border-[#194DB8] bg-[#EAF1FF] px-2 py-1 text-[8px] font-semibold uppercase text-[#073A98]">{job.status}</span></div></div></article>;
}

export function LiveMoreFromClientCard({ jobs, clientName }: { jobs: AllJob[]; clientName: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = normalizedQuery ? jobs.filter((job) => `${job.title} ${clientName}`.toLowerCase().includes(normalizedQuery)) : jobs;

  return <>
    <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><header className="px-4 pt-4 pb-3"><h2 className="text-xl font-semibold text-[#2A2020]">More from this Client</h2><label className="relative mt-3 block"><span className="sr-only">Search this client jobs</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#788495]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title or client name..." className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] pr-3 pl-9 text-xs text-[#303846] outline-none focus:border-[#A61919]" /></label></header>
      <div className="max-h-56 overflow-y-auto border-t border-[#E3E5E8]">{visible.slice(0, 10).map((job) => <RelatedJobItem key={job.id} job={job} />)}{visible.length === 0 ? <p className="px-4 py-10 text-center text-xs text-[#8A94A3]">Belum ada Job lain untuk Client ini.</p> : null}</div>
      {jobs.length > 0 ? <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-full items-center justify-center border-t border-[#E3E5E8] text-xs font-semibold text-[#8C1010] hover:bg-[#FFF6F6]">View All Jobs</button> : null}
    </section>
    <AdminModal open={open} onClose={() => setOpen(false)} title="All Client Jobs" description={`Job lain untuk ${clientName}.`} size="lg"><div className="max-h-[55vh] overflow-y-auto rounded-xl border border-[#E3E5E8]">{jobs.map((job) => <RelatedJobItem key={job.id} job={job} />)}</div></AdminModal>
  </>;
}
