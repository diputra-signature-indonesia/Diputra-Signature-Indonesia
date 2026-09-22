'use client';

import { changeJobStepAction, reopenJobAction } from '@/app/admin/all-jobs/[jobId]/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { LiveJobDetail } from '@/lib/supabase/queries/job-detail';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function LiveCurrentStepsCard({ detail }: { detail: LiveJobDetail }) {
  const router = useRouter();
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [reopen, setReopen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const completedCount = detail.steps.filter((step) => step.is_completed).length;
  const completed = detail.statusCode === 'COMPLETED';
  const finalLocked = detail.statusCode === 'ON_HOLD' || detail.statusCode === 'OBSTACLE';
  const currentIndex = completedCount < detail.steps.length ? completedCount : -1;
  const selected = pendingIndex === null ? null : detail.steps[pendingIndex];
  const reverting = pendingIndex !== null && pendingIndex < completedCount;
  const trackWidth = detail.steps.length > 1 ? `${Math.max(0, completedCount - 1) / (detail.steps.length - 1) * 100}%` : '0%';

  function confirmStep() {
    if (!selected) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await changeJobStepAction({ jobId: detail.job.id, stepId: selected.id, version: selected.version, action: reverting ? 'revert' : 'complete' });
        if (!result.ok) { setError(result.message); setPendingIndex(null); return; }
        setPendingIndex(null); router.refresh();
      } catch { setError('Koneksi terputus. Periksa status Job sebelum mencoba lagi.'); setPendingIndex(null); }
    });
  }

  function confirmReopen() {
    setError('');
    startTransition(async () => {
      try {
        const result = await reopenJobAction({ jobId: detail.job.id, version: detail.job.version, reason });
        if (!result.ok) { setError(result.message); return; }
        setReason(''); setReopen(false); router.refresh();
      } catch { setError('Koneksi terputus. Muat ulang halaman sebelum mencoba lagi.'); }
    });
  }

  return (
    <>
      <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-[#282828]">Current Steps</h2><p className="mt-1 text-xs text-[#69524F]">Only the PIC and admin can change the status of these steps.</p></div>
          {completed && detail.canManage ? <button type="button" onClick={() => { setError(''); setReopen(true); }} className="rounded border border-[#9F1010] px-3 py-1.5 text-xs font-semibold text-[#9F1010] hover:bg-[#FFF6F6]">Reopen Job</button> : null}
        </div>
        {finalLocked && currentIndex === detail.steps.length - 1 ? <p className="mt-3 text-xs text-amber-700">Selesaikan status {detail.summary.status} terlebih dahulu sebelum menuntaskan tahap terakhir.</p> : null}
        {error ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}
        <div className="mt-5 overflow-x-auto pb-1">
          <div className="relative min-w-[560px]">
            <div aria-hidden="true" className="absolute top-4 right-7 left-7 h-px bg-[#E0B5B0]"><span className="block h-full bg-[#20BF6B]" style={{ width: trackWidth }} /></div>
            <div className="relative flex justify-between px-3">
              {detail.steps.map((step, index) => {
                const current = index === currentIndex;
                const canRevert = index === completedCount - 1 && step.is_completed && !completed;
                const canComplete = current && !(finalLocked && index === detail.steps.length - 1);
                const enabled = detail.canManage && !isPending && (canRevert || canComplete);
                return (
                  <div key={step.id} className="flex w-8 shrink-0 flex-col items-center text-center">
                    <button type="button" disabled={!enabled} onClick={() => setPendingIndex(index)}
                      aria-label={`${canRevert ? 'Revert' : canComplete ? 'Complete' : 'Locked'} step ${step.name}`}
                      className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 ${step.is_completed ? 'border-[#20BF6B] bg-[#20BF6B] text-white' : current ? 'border-[#9F1010] bg-[#FFF9F8] text-[#9F1010]' : 'border-[#E5BBB6] bg-[#FFF9F8] text-[#E5BBB6]'} ${enabled ? 'hover:brightness-95' : 'cursor-not-allowed'}`}>
                      {step.is_completed ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : current ? <span className="size-2.5 rounded-full bg-current" /> : null}
                    </button>
                    <span className={`mt-2 whitespace-nowrap text-xs font-semibold ${step.is_completed ? 'text-[#2B2B2B]' : current ? 'text-[#9F1010]' : 'text-[#E1B8B3]'}`}>{step.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <AdminModal open={pendingIndex !== null} onClose={() => { if (!isPending) setPendingIndex(null); }} size="sm"
        title={reverting ? `Kembalikan tahap ${selected?.name}?` : `Selesaikan tahap ${selected?.name}?`}
        description={reverting ? 'Hanya tahap selesai terakhir yang dapat dikembalikan.' : 'Tahap berikutnya akan terbuka setelah konfirmasi.'}
        footer={<><button type="button" disabled={isPending} onClick={() => setPendingIndex(null)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending} onClick={confirmStep} className="h-9 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menyimpan…' : 'Confirm'}</button></>}
      />
      <AdminModal open={reopen} onClose={() => { if (!isPending) setReopen(false); }} size="sm" title="Reopen Job" description="Alasan wajib diisi. Tahap terakhir akan kembali belum selesai."
        footer={<><button type="button" disabled={isPending} onClick={() => setReopen(false)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending || !reason.trim()} onClick={confirmReopen} className="h-9 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menyimpan…' : 'Reopen'}</button></>}>
        <label htmlFor="reopen-job-reason" className="mb-1 block text-xs font-semibold">Alasan *</label>
        <textarea id="reopen-job-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 w-full rounded-lg border border-[#D6DAE0] p-3 text-sm outline-none focus:border-[#8C1010]" />
        {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}
      </AdminModal>
    </>
  );
}
