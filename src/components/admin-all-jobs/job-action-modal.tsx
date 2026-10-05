'use client';

import { changeJobStatusAction } from '@/app/admin/all-jobs/[jobId]/actions';
import { trashJobAction } from '@/app/admin/all-jobs/row-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { JobActionDetail } from '@/lib/supabase/queries/job-action-detail';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';

type Status = 'IN_PROGRESS' | 'ON_HOLD' | 'OBSTACLE';
export function JobActionModal({ detail, mode, onClose, onSaved }: { detail: JobActionDetail; mode: 'status' | 'trash'; onClose: () => void; onSaved: (message: string, warning?: boolean) => void }) {
  const router = useRouter();
  const id = useId();
  const [status, setStatus] = useState<Status>(detail.statusCode === 'ON_HOLD' || detail.statusCode === 'OBSTACLE' ? detail.statusCode : 'IN_PROGRESS');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const deleting = mode === 'trash';
  const canSave = deleting
    ? detail.canChangePic && [detail.job.title, detail.summary.client].includes(confirmation.trim())
    : detail.canManage && detail.statusCode !== 'COMPLETED' && status !== detail.statusCode && (status === 'IN_PROGRESS' || Boolean(reason.trim()));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSave) return;
    setError('');
    startTransition(async () => {
      try {
        if (deleting) {
          const result = await trashJobAction({ jobId: detail.job.id, version: detail.job.version, confirmation });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          onSaved(result.warning ?? 'Job berhasil dipindahkan ke Trash.', Boolean(result.warning));
        } else {
          const result = await changeJobStatusAction({ jobId: detail.job.id, version: detail.job.version, statusCode: status, reason });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          onSaved('Status Job berhasil diperbarui.');
        }
        onClose();
        router.refresh();
      } catch {
        setError('Hasil operasi belum dapat dikonfirmasi. Muat ulang data sebelum mencoba lagi.');
      }
    });
  }
  return (
    <AdminModal
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title={deleting ? 'Move Job to Trash?' : 'Change Job Status'}
      description={detail.job.title}
      size="sm"
      footer={
        <>
          <button type="button" disabled={pending} onClick={onClose} className="rounded-lg border border-[#D4D9E1] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            form={id}
            disabled={pending || !canSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[#9F1010] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            {pending ? 'Saving...' : deleting ? 'Move to Trash' : 'Save Status'}
          </button>
        </>
      }
    >
      <form id={id} onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">
          {deleting ? (
            <>
              <p className="text-sm leading-6 text-[#64748B]">
                Job akan disembunyikan dari daftar aktif dan dapat dipulihkan melalui Trash. Folder Job beserta isinya juga akan dipindahkan ke Google Drive Trash. Data tidak dihapus permanen.
              </p>
              <label htmlFor={`${id}-confirmation`} className="block text-sm font-semibold">
                Ketik judul Job atau nama Client untuk konfirmasi
              </label>
              <p className="rounded-lg bg-gray-50 p-3 text-sm break-words">
                {detail.job.title}
                <br />
                <span className="text-[#64748B]">atau {detail.summary.client}</span>
              </p>
              <input
                id={`${id}-confirmation`}
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                className="w-full rounded-lg border border-[#D6DAE0] px-3 py-2 text-sm"
              />
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-[#64748B]">Perubahan tercatat di Jobs Logging. Status Completed mengikuti penyelesaian tahapan workflow, bukan pilihan manual.</p>
              <label htmlFor={`${id}-status`} className="block text-sm font-semibold">
                Status
              </label>
              <select
                id={`${id}-status`}
                autoFocus
                value={status}
                onChange={(event) => setStatus(event.target.value as Status)}
                className="w-full rounded-lg border border-[#D6DAE0] px-3 py-2 text-sm"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="OBSTACLE">Obstacle</option>
              </select>
              {status !== 'IN_PROGRESS' ? (
                <div>
                  <label htmlFor={`${id}-reason`} className="mb-2 block text-sm font-semibold">
                    Alasan *
                  </label>
                  <textarea
                    id={`${id}-reason`}
                    required
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-[#D6DAE0] p-3 text-sm"
                  />
                </div>
              ) : null}
            </>
          )}
        </fieldset>
        {error ? (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                onClose();
                router.refresh();
              }}
              className="mt-2 font-semibold underline"
            >
              Muat ulang data
            </button>
          </div>
        ) : null}
      </form>
    </AdminModal>
  );
}
