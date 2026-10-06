'use client';

import { listTrashJobsAction, restoreJobAction, retryJobDriveTrashAction, type TrashJobRow } from '@/app/admin/all-jobs/row-actions';
import { JobDeletionModal } from './job-deletion-modal';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { LoaderCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

function JobTrashModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<TrashJobRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<TrashJobRow | null>(null);
  useEffect(() => {
    let active = true;
    void listTrashJobsAction(page)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          const lastPage = Math.max(1, Math.ceil(result.data.count / 10));
          if (page > lastPage) {
            setPage(lastPage);
            return;
          }
          setRows(result.data.rows);
          setCount(result.data.count);
        } else setError(result.message);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('Daftar Trash gagal dimuat. Silakan coba lagi.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [page, reload]);
  function run(job: TrashJobRow, restore: boolean) {
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        const input = { jobId: job.id, version: job.version };
        const result = restore ? await restoreJobAction(input) : await retryJobDriveTrashAction(input);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setMessage(restore ? 'Job berhasil dipulihkan.' : 'Folder Drive sudah berada di Trash.');
        setLoading(true);
        setReload((value) => value + 1);
        router.refresh();
      } catch {
        setError('Operasi belum dapat dikonfirmasi. Muat ulang daftar Trash.');
      }
    });
  }
  return (
    <>
      <AdminModal
        open={!deleting}
        onClose={() => {
          if (!pending) onClose();
        }}
        title="Jobs Trash"
        description="Trash lama tetap dapat dipulihkan. Penghapusan permanen menampilkan dampak dan meminta konfirmasi judul terlebih dahulu."
        size="lg"
        footer={
          <button type="button" disabled={pending} onClick={onClose} className="rounded-lg border border-[#D4D9E1] px-4 py-2 text-sm font-semibold">
            Close
          </button>
        }
      >
        <div className="space-y-4">
          {message ? (
            <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={pending || loading}
            onClick={() => {
              setError('');
              setLoading(true);
              setReload((value) => value + 1);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8C1010]"
          >
            <RotateCcw aria-hidden="true" className="size-4" /> Refresh
          </button>
          {loading ? (
            <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm">
              <LoaderCircle className="size-4 animate-spin" /> Loading Trash...
            </p>
          ) : rows.length ? (
            <ul className="divide-y divide-[#E7E9ED] rounded-lg border border-[#E7E9ED]">
              {rows.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold break-words">{job.title}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {job.archived_at ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Makassar' }).format(new Date(job.archived_at)) : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={pending} onClick={() => run(job, false)} className="rounded-lg border border-[#D4D9E1] px-3 py-2 text-xs disabled:opacity-50">
                      Retry Drive Trash
                    </button>
                    <button type="button" disabled={pending} onClick={() => run(job, true)} className="rounded-lg bg-[#8C1010] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      Restore Job
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setDeleting(job);
                        setError('');
                      }}
                      className="rounded-lg border border-[#E8B4B4] px-3 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FFF0EF] disabled:opacity-50"
                    >
                      Delete Permanently
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-[#64748B]">Trash Job kosong.</p>
          )}
          <div className="flex items-center justify-between text-xs">
            <span>{count} jobs</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending || loading || page === 1}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => value - 1);
                }}
                className="disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil(count / 10))}
              </span>
              <button
                type="button"
                disabled={pending || loading || page * 10 >= count}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => value + 1);
                }}
                className="disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </AdminModal>
      {deleting ? (
        <JobDeletionModal
          jobId={deleting.id}
          version={deleting.version}
          onClose={() => setDeleting(null)}
          onSaved={(notice) => {
            setMessage(notice);
            setDeleting(null);
            setLoading(true);
            setReload((value) => value + 1);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

export function JobTrashButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Jobs Trash"
        title="Jobs Trash"
        className="flex size-8 items-center justify-center rounded border border-[#D4D9E1] text-[#8C1010] hover:bg-red-50"
      >
        <Trash2 className="size-4" />
      </button>
      {open ? <JobTrashModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
