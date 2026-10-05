'use client';

import { moveTaskAction } from '@/app/admin/all-jobs/[jobId]/task-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { MyTaskItem, MyTaskJob } from '@/types/admin-my-tasks';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { MyTaskStatusBadge } from './my-task-status-badge';
import type { MyTaskAction } from './task-row-actions';

export function TaskActionModal({
  job,
  task,
  mode,
  onClose,
  onChangeStatus,
  onSaved,
}: {
  job: MyTaskJob;
  task: MyTaskItem;
  mode: MyTaskAction;
  onClose: () => void;
  onChangeStatus: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const formId = useId();
  const selectId = useId();
  const [statusId, setStatusId] = useState(task.statusId);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const changingStatus = mode === 'status';
  const canSave = task.canChangeStatus && statusId !== task.statusId && job.statuses.some((status) => status.id === statusId);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSave) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await moveTaskAction({ jobId: job.id, taskId: task.id, version: task.version, statusId, beforeTaskId: null });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSaved();
        onClose();
        router.refresh();
      } catch {
        setError('Perubahan Task belum dapat dikonfirmasi. Muat ulang halaman sebelum mencoba lagi.');
      }
    });
  }
  const secondary = 'rounded-lg border border-[#D4D9E1] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-gray-50 disabled:opacity-50';
  const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#A00C10] px-4 py-2 text-sm font-semibold text-white hover:bg-[#870A0D] disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <AdminModal
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title={changingStatus ? 'Change Task Status' : 'Task Detail'}
      description={task.detail}
      size={changingStatus ? 'sm' : 'lg'}
      footer={
        <>
          <button type="button" disabled={pending} onClick={onClose} className={secondary}>
            {changingStatus ? 'Cancel' : 'Close'}
          </button>
          {changingStatus ? (
            <button type="submit" form={formId} disabled={pending || !canSave} className={primary}>
              {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
              {pending ? 'Saving...' : 'Save Status'}
            </button>
          ) : task.canChangeStatus ? (
            <button type="button" onClick={onChangeStatus} className={primary}>
              Change Status
            </button>
          ) : null}
        </>
      }
    >
      {changingStatus ? (
        <form id={formId} onSubmit={submit} className="space-y-4">
          <p className="text-sm text-[#707988]">Pilih status yang tersedia pada Job ini. Perubahan ini tidak mengubah status Job.</p>
          <label htmlFor={selectId} className="block text-sm font-semibold text-[#202938]">
            Task status
          </label>
          <select
            id={selectId}
            value={statusId}
            onChange={(event) => setStatusId(event.target.value)}
            autoFocus
            disabled={pending || !task.canChangeStatus}
            className="w-full rounded-lg border border-[#D4D9E1] bg-white px-3 py-2.5 text-sm text-[#202938] focus:border-[#A00C10] focus:outline-none"
          >
            {job.statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
      ) : (
        <div className="space-y-5">
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            {[
              ['Job', job.title],
              ['Client', job.client],
              ['Assignee', task.assigneeName],
              ['Priority', task.priorityName ?? 'No priority'],
              ['Deadline', task.deadline],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[#707988]">{label}</dt>
                <dd className="mt-1 font-medium break-words text-[#202938]">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-[#707988]">Status</dt>
              <dd className="mt-1">
                <MyTaskStatusBadge status={task.status} code={task.statusCode} />
              </dd>
            </div>
          </dl>
          <div className="border-t border-[#E7E9ED] pt-4">
            <h3 className="text-sm font-semibold text-[#202938]">Description</h3>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#475569]">{task.description?.trim() || 'Belum ada deskripsi Task.'}</p>
          </div>
          {!task.canChangeStatus ? <p className="text-xs text-[#707988]">Job sudah selesai atau Anda tidak memiliki izin mengubah Task ini.</p> : null}
        </div>
      )}
    </AdminModal>
  );
}
