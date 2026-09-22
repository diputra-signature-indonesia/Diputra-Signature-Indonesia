'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { LiveJobDetail } from '@/lib/supabase/queries/job-detail';
import { useState } from 'react';

type Contributor = LiveJobDetail['contributors'][number];

function ContributorItem({ contributor }: { contributor: Contributor }) {
  const initials = contributor.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  return <div className="flex items-center gap-3 px-4 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#A91217] text-xs font-semibold text-white">{initials}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-[#2A2020]">{contributor.name}</span>{contributor.role ? <span className="text-[10px] uppercase tracking-[0.08em] text-[#A91217]">{contributor.role}</span> : null}</div>;
}

export function LiveContributorCard({ contributors }: { contributors: LiveJobDetail['contributors'] }) {
  const [open, setOpen] = useState(false);
  return <>
    <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <header className="border-b border-[#E3E5E8] px-4 py-4"><h2 className="text-xl font-semibold text-[#2A2020]">Contributor</h2><p className="mt-1 text-xs text-[#695E5C]">PIC and people assigned to this Job&apos;s tasks.</p></header>
      <div>{contributors.slice(0, 3).map((contributor) => <ContributorItem key={contributor.id} contributor={contributor} />)}</div>
      {contributors.length > 3 ? <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-full items-center justify-center text-xs font-semibold text-[#8C1010] hover:bg-[#FFF6F6]">View More</button> : null}
    </section>
    <AdminModal open={open} onClose={() => setOpen(false)} title="All Contributors" description="PIC and assignees from active tasks."><div className="divide-y divide-[#E7E9ED]">{contributors.map((contributor) => <ContributorItem key={contributor.id} contributor={contributor} />)}</div></AdminModal>
  </>;
}
