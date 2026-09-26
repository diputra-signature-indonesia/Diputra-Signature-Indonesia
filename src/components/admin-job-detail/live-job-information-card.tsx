'use client';

import { changeJobStatusAction } from '@/app/admin/all-jobs/[jobId]/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { LiveJobDetail } from '@/lib/supabase/queries/job-detail';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type SelectableStatus = 'IN_PROGRESS' | 'ON_HOLD' | 'OBSTACLE';

export function LiveJobInformationCard({ detail }: { detail: LiveJobDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [statusCode, setStatusCode] = useState<SelectableStatus>('IN_PROGRESS');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const canChangeStatus = detail.canManage && detail.statusCode !== 'COMPLETED';

  function submit() {
    setError('');
    startTransition(async () => {
      try {
        const result = await changeJobStatusAction({ jobId: detail.job.id, version: detail.job.version, statusCode, reason });
        if (!result.ok) { setError(result.message); return; }
        setOpen(false); setReason(''); router.refresh();
      } catch { setError('Koneksi terputus. Muat ulang halaman sebelum mencoba lagi.'); }
    });
  }

  const fields = [
    ['Client', detail.summary.client], ['PIC', detail.summary.pic], ['Internal Service', detail.summary.internalService],
    ['Priority', detail.summary.priority], ['Start Date', detail.summary.startDate],
    ['Estimated End Date', detail.summary.estimatedEndDate], ['Estimated Duration', detail.summary.estimatedDuration],
    ['Deadline', detail.summary.deadlineNote],
  ];

  return (
    <>
      <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[#282828]">Job Information</h2>{canChangeStatus ? <button type="button" onClick={() => { setStatusCode(detail.statusCode === 'ON_HOLD' || detail.statusCode === 'OBSTACLE' || detail.statusCode === 'IN_PROGRESS' ? detail.statusCode : 'IN_PROGRESS'); setReason(''); setError(''); setOpen(true); }} className="rounded border border-[#9F1010] px-3 py-1.5 text-xs font-semibold text-[#9F1010] hover:bg-[#FFF6F6]">Change Status</button> : null}</div>
        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {fields.map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-[0.08em] text-[#A2A2A8]">{label}</dt><dd className="mt-1 text-sm font-semibold text-[#111348]">{value}</dd></div>)}
          <div><dt className="text-[10px] uppercase tracking-[0.08em] text-[#A2A2A8]">Status</dt><dd className="mt-1"><span style={detail.summary.statusColor ? { color: detail.summary.statusColor, borderColor: detail.summary.statusColor, backgroundColor: `${detail.summary.statusColor}15` } : undefined} className="inline-flex rounded border border-[#E4B400] bg-[#FFF9E8] px-2 py-1 text-[11px] font-semibold uppercase text-[#756000]">{detail.summary.status}</span></dd></div>
          <div className="sm:col-span-2 xl:col-span-3"><dt className="text-[10px] uppercase tracking-[0.08em] text-[#A2A2A8]">Description</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-[#111348]">{detail.job.description || '—'}</dd></div>
          {detail.job.status_reason ? <div className="sm:col-span-2 xl:col-span-4"><dt className="text-[10px] uppercase tracking-[0.08em] text-[#A2A2A8]">Status Reason</dt><dd className="mt-1 text-sm text-[#7F2B2B]">{detail.job.status_reason}</dd></div> : null}
        </dl>
      </section>
      <AdminModal open={open} onClose={() => { if (!isPending) setOpen(false); }} title="Change Job Status" description="Perubahan status tercatat pada Jobs Logging." size="sm"
        footer={<><button type="button" disabled={isPending} onClick={() => setOpen(false)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending || statusCode === detail.statusCode || statusCode !== 'IN_PROGRESS' && !reason.trim()} onClick={submit} className="h-9 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menyimpan…' : 'Save Status'}</button></>}>
        <label htmlFor="job-status-choice" className="mb-1 block text-xs font-semibold">Status</label>
        <select id="job-status-choice" className="h-10 w-full rounded-lg border border-[#D6DAE0] px-3 text-sm" value={statusCode} onChange={(event) => setStatusCode(event.target.value as SelectableStatus)}><option value="IN_PROGRESS">In Progress</option><option value="ON_HOLD">On Hold</option><option value="OBSTACLE">Obstacle</option></select>
        {statusCode !== 'IN_PROGRESS' ? <div className="mt-4"><label htmlFor="job-status-reason" className="mb-1 block text-xs font-semibold">Alasan *</label><textarea id="job-status-reason" maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 w-full rounded-lg border border-[#D6DAE0] p-3 text-sm" /></div> : null}
        {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}
      </AdminModal>
    </>
  );
}
