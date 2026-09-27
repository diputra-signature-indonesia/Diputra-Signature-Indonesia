'use client';

import { moveTaskAction } from '@/app/admin/all-jobs/[jobId]/task-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { MyTaskItem, MyTaskJob } from '@/types/admin-my-tasks';
import { EllipsisVertical, Eye, LoaderCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { MyTaskStatusBadge } from './my-task-status-badge';

type Props = {
  job: MyTaskJob;
  task: MyTaskItem;
};

const fieldClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none focus:border-[#8C1010]';

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  }).format(new Date(value));
}

export function TaskRowActions({ job, task }: Props) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusId, setStatusId] = useState(task.statusId);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    document.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('mousedown', close);
    };
  }, [menu]);

  function toggleMenu() {
    if (menu) {
      setMenu(null);
      return;
    }
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setMenu({ top: bounds.bottom + 6, right: Math.max(12, window.innerWidth - bounds.right) });
  }

  function openStatus() {
    setMenu(null);
    setError('');
    setStatusId(task.statusId);
    setStatusOpen(true);
  }

  function saveStatus() {
    if (!statusId || statusId === task.statusId || isPending) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await moveTaskAction({
          jobId: job.id,
          taskId: task.id,
          version: task.version,
          statusId,
          beforeTaskId: null,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setStatusOpen(false);
        router.refresh();
      } catch {
        setError('Koneksi terputus. Muat ulang halaman lalu coba kembali.');
      }
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for ${task.detail}`}
        aria-expanded={Boolean(menu)}
        onClick={(event) => {
          event.stopPropagation();
          toggleMenu();
        }}
        className="inline-flex rounded-md p-1.5 text-[#8C716D] transition hover:bg-gray-100 hover:text-[#202938]"
      >
        <EllipsisVertical aria-hidden="true" className="size-4" />
      </button>

      {menu ? (
        <div
          role="menu"
          style={{ top: menu.top, right: menu.right }}
          onMouseDown={(event) => event.stopPropagation()}
          className="fixed z-[65] w-44 rounded-lg border border-[#DEE2E7] bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
        >
          <button
            type="button"
            onClick={() => {
              setMenu(null);
              setDetailOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-[#344054] hover:bg-[#F6F7F9]"
          >
            <Eye className="size-3.5" />
            View Detail
          </button>
          {task.canEdit ? (
            <button type="button" onClick={openStatus} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-[#344054] hover:bg-[#F6F7F9]">
              <RefreshCw className="size-3.5" />
              Change Status
            </button>
          ) : null}
        </div>
      ) : null}

      <AdminModal open={detailOpen} onClose={() => setDetailOpen(false)} title="Task Detail" description={`${job.client} · ${job.title}`} size="lg">
        <div className="space-y-5 text-sm text-[#303846]">
          <div>
            <p className="text-xs font-semibold tracking-[0.04em] text-[#7A8493] uppercase">Task</p>
            <p className="mt-1 text-base font-semibold text-[#202938]">{task.detail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.04em] text-[#7A8493] uppercase">Description</p>
            <p className="mt-1 leading-6 whitespace-pre-wrap text-[#515B69]">{task.description?.trim() || 'No description provided.'}</p>
          </div>
          <dl className="grid gap-4 rounded-xl border border-[#E2E5E9] bg-[#FAFAFB] p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#7A8493]">Status</dt>
              <dd className="mt-1">
                <MyTaskStatusBadge status={task.status} code={task.statusCode} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#7A8493]">Deadline</dt>
              <dd className="mt-1 font-medium">{task.deadline}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#7A8493]">Assignee</dt>
              <dd className="mt-1 font-medium">{task.assigneeName}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#7A8493]">Priority</dt>
              <dd className="mt-1 font-medium">{task.priorityName}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#7A8493]">Internal Service</dt>
              <dd className="mt-1 font-medium">{job.internalService}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#7A8493]">Created</dt>
              <dd className="mt-1 font-medium">{formatCreatedAt(task.createdAt)}</dd>
            </div>
          </dl>
          <div className="flex justify-end border-t border-[#E7E9ED] pt-4">
            <button type="button" onClick={() => setDetailOpen(false)} className="rounded border border-[#9EACBF] px-5 py-2 text-xs font-semibold">
              Close
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={statusOpen}
        onClose={() => {
          if (!isPending) setStatusOpen(false);
        }}
        title="Change Task Status"
        description={task.detail}
        size="sm"
        footer={
          <>
            <button type="button" disabled={isPending} onClick={() => setStatusOpen(false)} className="rounded border border-[#9EACBF] px-5 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || statusId === task.statusId}
              onClick={saveStatus}
              className="inline-flex items-center gap-2 rounded bg-[#8C1010] px-5 py-2 text-xs font-semibold text-white disabled:opacity-45"
            >
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {isPending ? 'Saving…' : 'Save Status'}
            </button>
          </>
        }
      >
        <label htmlFor={`task-status-${task.id}`} className="mb-1 block text-xs font-semibold">
          Status
        </label>
        <select id={`task-status-${task.id}`} value={statusId} disabled={isPending} onChange={(event) => setStatusId(event.target.value)} className={fieldClass}>
          {job.statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs leading-5 text-[#707988]">Task akan dipindahkan ke bagian paling bawah pada kolom status yang dipilih.</p>
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </AdminModal>
    </>
  );
}
