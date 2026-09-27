'use client';

import { permanentlyDeleteJobAction, restoreJobAction } from '@/app/admin/all-jobs/trash-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { TrashedJob } from '@/lib/supabase/queries/job-trash';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(value));
}

function daysRemaining(value: string) {
  return Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 86_400_000));
}

export function TrashJobsButton({ jobs }: { jobs: TrashedJob[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<TrashedJob | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isPending, startTransition] = useTransition();
  const confirmed = deleting && (confirmation.trim() === deleting.title || confirmation.trim() === deleting.client);

  function restore(job: TrashedJob) {
    setPendingId(job.id);
    setError('');
    setNotice('');
    startTransition(async () => {
      const result = await restoreJobAction({ jobId: job.id, version: job.version });
      setPendingId(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
      router.refresh();
    });
  }

  function permanentlyDelete() {
    if (!deleting || !confirmed) return;
    setPendingId(deleting.id);
    setError('');
    setNotice('');
    startTransition(async () => {
      const result = await permanentlyDeleteJobAction({ jobId: deleting.id, version: deleting.version, confirmation });
      setPendingId(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDeleting(null);
      setConfirmation('');
      setNotice(result.message);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError('');
          setNotice('');
          setOpen(true);
        }}
        className="relative inline-flex size-8 items-center justify-center rounded border border-[#C7CDD6] bg-white text-[#8C1010] transition hover:bg-[#FFF6F6]"
        aria-label={`Open Job Trash${jobs.length ? `, ${jobs.length} items` : ''}`}
        title="Job Trash"
      >
        <Trash2 className="size-4" />
        {jobs.length ? (
          <span className="absolute -top-2 -right-2 flex min-w-4.5 items-center justify-center rounded-full bg-[#8C1010] px-1 text-[9px] leading-[18px] font-bold text-white">
            {jobs.length > 99 ? '99+' : jobs.length}
          </span>
        ) : null}
      </button>

      <AdminModal
        open={open}
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        title="Job Trash"
        description="Job disimpan di Trash selama 30 hari. Pulihkan Job atau hapus permanen lebih awal bila sudah tidak diperlukan."
        size="lg"
      >
        {error ? (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
            {notice}
          </p>
        ) : null}
        {!jobs.length ? (
          <div className="py-12 text-center">
            <Trash2 className="mx-auto size-8 text-[#B1B7C0]" />
            <p className="mt-3 text-sm font-semibold text-[#4B5563]">Trash masih kosong</p>
            <p className="mt-1 text-xs text-[#8A94A3]">Job yang dihapus akan tampil di sini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const days = daysRemaining(job.deleteAfter);
              return (
                <article key={job.id} className="flex flex-col gap-3 rounded-xl border border-[#E1E4E8] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[#2E3642]">{job.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-[#68717E]">{job.client}</p>
                    <p className="mt-2 text-[11px] text-[#929AA6]">
                      Deleted {formatDate(job.archivedAt)} · retention ends {formatDate(job.deleteAfter)} ({days} days)
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => restore(job)}
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-[#9EACBF] px-3 text-[11px] font-semibold text-[#344054] disabled:opacity-50"
                    >
                      <RotateCcw className={`size-3.5 ${pendingId === job.id ? 'animate-spin' : ''}`} />
                      Restore
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setDeleting(job);
                        setConfirmation('');
                        setError('');
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-red-200 px-3 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      Delete permanently
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(deleting)}
        onClose={() => {
          if (!isPending) setDeleting(null);
        }}
        title="Delete Job Permanently"
        description="Tindakan ini tidak dapat dibatalkan. Data operasional Job dan folder Google Drive akan dihapus permanen."
        size="sm"
        footer={
          <>
            <button type="button" disabled={isPending} onClick={() => setDeleting(null)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">
              Cancel
            </button>
            <button type="button" disabled={isPending || !confirmed} onClick={permanentlyDelete} className="h-9 rounded bg-red-600 px-5 text-xs font-semibold text-white disabled:opacity-50">
              {isPending ? 'Deleting…' : 'Delete permanently'}
            </button>
          </>
        }
      >
        {deleting ? (
          <>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
              Ketik persis <strong>{deleting.title}</strong> atau <strong>{deleting.client}</strong>.
            </div>
            <label htmlFor="permanent-delete-job" className="mt-4 mb-1.5 block text-xs font-semibold">
              Confirmation
            </label>
            <input
              id="permanent-delete-job"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                setError('');
              }}
              className="h-10 w-full rounded-lg border border-[#D6DAE0] px-3 text-sm outline-none focus:border-red-500"
            />
          </>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </AdminModal>
    </>
  );
}
