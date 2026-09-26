'use client';

import { deleteJobRemarkAction, saveJobRemarkAction } from '@/app/admin/all-jobs/[jobId]/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { LiveJobDetail } from '@/lib/supabase/queries/job-detail';
import { CalendarDays, ListFilter, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Remark = LiveJobDetail['remarks'][number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}

export function LiveRemarksCard({ detail }: { detail: LiveJobDetail }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Remark | null>(null);
  const [deleting, setDeleting] = useState<Remark | null>(null);
  const [message, setMessage] = useState('');
  const [progressDate, setProgressDate] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const canManage = detail.canManage && detail.statusCode !== 'COMPLETED';
  const [latest, ...previous] = detail.remarks;

  function openForm(remark: Remark | null) {
    setEditing(remark); setMessage(remark?.message ?? ''); setProgressDate(remark?.progress_date ?? '');
    setPerformedBy(remark?.performed_by ?? ''); setError(''); setFormOpen(true);
  }

  function save() {
    setError('');
    startTransition(async () => {
      try {
        const result = await saveJobRemarkAction({ jobId: detail.job.id, remarkId: editing?.id, version: editing?.version, message, progressDate, performedBy: performedBy || null });
        if (!result.ok) { setError(result.message); return; }
        setFormOpen(false); router.refresh();
      } catch { setError('Koneksi terputus. Periksa remarks sebelum mencoba lagi.'); }
    });
  }

  function remove() {
    if (!deleting) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await deleteJobRemarkAction({ jobId: detail.job.id, remarkId: deleting.id, version: deleting.version });
        if (!result.ok) { setError(result.message); return; }
        setDeleting(null); router.refresh();
      } catch { setError('Koneksi terputus. Periksa remarks sebelum mencoba lagi.'); }
    });
  }

  function content(remark: Remark, prominent: boolean) {
    return <>
      <div className="flex items-start justify-between gap-3">
        <p className={`${prominent ? 'text-base' : 'text-sm'} whitespace-pre-wrap font-medium text-[#2F2928]`}>{remark.message}</p>
        {canManage ? <div className="flex shrink-0 gap-1"><button type="button" aria-label={`Edit remark ${remark.id}`} onClick={() => openForm(remark)} className="rounded p-1 text-[#68717E] hover:bg-gray-100"><Pencil className="size-3.5" /></button><button type="button" aria-label={`Delete remark ${remark.id}`} onClick={() => { setError(''); setDeleting(remark); }} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /></button></div> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#695E5C]">
        {remark.performedByName ? <span className="flex items-center gap-1"><UserRound className="size-3" />Performed by: <strong>{remark.performedByName}</strong></span> : null}
        <span className="flex items-center gap-1"><ListFilter className="size-3" />By: {remark.createdByName}</span>
        <span className="flex items-center gap-1"><CalendarDays className="size-3" />Created: {formatDate(remark.created_at)}</span>
      </div>
      <p className={`mt-2 ${prominent ? 'text-xs text-emerald-600' : 'text-[10px] text-[#817977]'}`}>Progress: {formatDate(remark.progress_date)}</p>
    </>;
  }

  return <>
    <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><h2 className="text-xl font-semibold text-[#2A2020]">Remarks</h2><span className="flex size-6 items-center justify-center rounded-full bg-[#DDF8E8] text-xs font-semibold text-[#2D7B4F]">{detail.remarks.length}</span></div>{canManage ? <button type="button" aria-label="Add remark" onClick={() => openForm(null)} className="flex size-8 items-center justify-center rounded-lg text-[#2A2020] hover:bg-gray-100"><Plus className="size-5" /></button> : null}</div>
      {latest ? <article className="mt-4 rounded-lg border border-[#D9DDE3] p-4">{content(latest, true)}</article> : <p className="mt-4 rounded-lg border border-dashed border-[#D9DDE3] px-4 py-8 text-center text-sm text-[#8A94A3]">Belum ada remark untuk Job ini.</p>}
      {previous.length ? <div className="relative mt-5 ml-4 border-l border-[#D5D5D5] pl-6">{previous.map((remark, index) => <article key={remark.id} className={`relative py-3 ${index < previous.length - 1 ? 'border-b border-[#E0E0E0]' : ''}`}><span className="absolute top-5 -left-[31px] size-3.5 rounded-full bg-[#D5D5D5]" />{content(remark, false)}</article>)}</div> : null}
    </section>
    <AdminModal open={formOpen} onClose={() => { if (!isPending) setFormOpen(false); }} title={editing ? 'Edit Remark' : 'Add Remark'} description="Tanggal progres dipilih manual dan menentukan urutan remarks."
      footer={<><button type="button" disabled={isPending} onClick={() => setFormOpen(false)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending || !message.trim() || !progressDate} onClick={save} className="h-9 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menyimpan…' : 'Save Remark'}</button></>}>
      <div className="space-y-4"><div><label htmlFor="remark-message" className="mb-1 block text-xs font-semibold">Remark *</label><textarea id="remark-message" maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-28 w-full rounded-lg border border-[#D6DAE0] p-3 text-sm outline-none focus:border-[#8C1010]" /></div><div><label htmlFor="remark-progress-date" className="mb-1 block text-xs font-semibold">Progress Date *</label><input id="remark-progress-date" type="date" value={progressDate} onChange={(event) => setProgressDate(event.target.value)} className="h-10 w-full rounded-lg border border-[#D6DAE0] px-3 text-sm" /></div><div><label htmlFor="remark-performed-by" className="mb-1 block text-xs font-semibold">Performed By (opsional)</label><select id="remark-performed-by" value={performedBy} onChange={(event) => setPerformedBy(event.target.value)} className="h-10 w-full rounded-lg border border-[#D6DAE0] px-3 text-sm"><option value="">Tidak ditentukan</option>{detail.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}</select></div>{error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}</div>
    </AdminModal>
    <AdminModal open={Boolean(deleting)} onClose={() => { if (!isPending) setDeleting(null); }} title="Hapus Remark?" description="Remark akan dihapus permanen; aktivitas penghapusan tetap tercatat."
      footer={<><button type="button" disabled={isPending} onClick={() => setDeleting(null)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending} onClick={remove} className="h-9 rounded bg-red-700 px-5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menghapus…' : 'Delete'}</button></>}>
      <p className="line-clamp-3 text-sm text-[#303846]">{deleting?.message}</p>{error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}
    </AdminModal>
  </>;
}
