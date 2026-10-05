'use client';

import { addJobContributorAction, removeJobContributorAction } from '@/app/admin/all-jobs/[jobId]/contributor-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { AdminRemoteSelect } from '@/components/layout-admin/admin-remote-select';
import type { LiveJobDetail } from '@/lib/supabase/queries/job-detail';
import { LoaderCircle, Plus, Trash2, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Contributor = LiveJobDetail['contributors'][number];

function ContributorItem({ contributor, canManage, pending, onRemove }: { contributor: Contributor; canManage: boolean; pending: boolean; onRemove: () => void }) {
  const initials = contributor.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#A91217] text-xs font-semibold text-white">{initials}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#2A2020]">{contributor.name}</span>
      <span className="text-[10px] tracking-[0.08em] text-[#A91217] uppercase">{contributor.role}</span>
      {canManage && contributor.canRemove ? (
        <button
          type="button"
          disabled={pending}
          onClick={onRemove}
          aria-label={`Remove ${contributor.name} from contributors`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-[#B42318] transition hover:bg-[#FFF0EF] disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function LiveContributorCard({ jobId, contributors, canManage }: { jobId: string; contributors: LiveJobDetail['contributors']; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addContributor() {
    if (!selectedProfileId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await addJobContributorAction({ jobId, profileId: selectedProfileId });
      if (!result.ok) return setMessage(result.message);
      setSelectedProfileId('');
      router.refresh();
    });
  }

  function removeContributor(profileId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await removeJobContributorAction({ jobId, profileId });
      if (!result.ok) return setMessage(result.message);
      router.refresh();
    });
  }

  const list = (items: Contributor[]) => (
    <div className="divide-y divide-[#E7E9ED]">
      {items.map((contributor) => (
        <ContributorItem key={contributor.id} contributor={contributor} canManage={canManage} pending={pending} onRemove={() => removeContributor(contributor.id)} />
      ))}
    </div>
  );

  return (
    <>
      <section className="overflow-visible rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <header className="rounded-t-xl border-b border-[#E3E5E8] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#2A2020]">Contributor</h2>
              <p className="mt-1 text-xs text-[#695E5C]">People who keep this Job in their Job List.</p>
            </div>
            <UsersRound className="mt-0.5 size-5 text-[#A91217]" />
          </div>
        </header>
        {canManage ? (
          <div className="border-b border-[#E7E9ED] p-3">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <AdminRemoteSelect kind="profiles" label="Add contributor" value={selectedProfileId} onChange={setSelectedProfileId} placeholder="Search contributor..." size="md" disabled={pending} />
              </div>
              <button
                type="button"
                onClick={addContributor}
                disabled={!selectedProfileId || pending || contributors.some((contributor) => contributor.id === selectedProfileId)}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#9F1010] text-white transition hover:bg-[#7F0D0D] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Add contributor"
              >
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </button>
            </div>
            {message ? <p className="mt-2 text-[11px] text-red-600">{message}</p> : null}
          </div>
        ) : null}
        {contributors.length ? list(contributors.slice(0, 3)) : <p className="px-4 py-7 text-center text-xs text-[#8A94A3]">No contributors yet.</p>}
        {contributors.length > 3 ? (
          <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-full items-center justify-center rounded-b-xl text-xs font-semibold text-[#8C1010] hover:bg-[#FFF6F6]">
            View More
          </button>
        ) : null}
      </section>
      <AdminModal open={open} onClose={() => setOpen(false)} title="All Contributors" description="PIC, manually added contributors, and people previously assigned to this Job.">
        {list(contributors)}
      </AdminModal>
    </>
  );
}
