'use client';

import { changeJobStatusAction } from '@/app/admin/all-jobs/[jobId]/actions';
import { trashJobAction } from '@/app/admin/all-jobs/trash-actions';
import { EditJobButton, type EditableJobDetail } from '@/components/admin-job-detail/edit-job-button';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { AllJob } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import type { AddJobOptions } from '@/lib/supabase/queries/add-job';
import { EllipsisVertical, ExternalLink, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

type SelectableStatus = 'IN_PROGRESS' | 'ON_HOLD' | 'OBSTACLE';

export function JobRowActions({ job, options, canManage, canDelete }: { job: AllJob; options: AddJobOptions; canManage: boolean; canDelete: boolean }) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusCode, setStatusCode] = useState<SelectableStatus>('IN_PROGRESS');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const ready = !job.isDummy && job.version && job.clientId && job.picId && job.internalServiceId && job.priorityId;
  const confirmed = confirmation.trim() === job.title || confirmation.trim() === job.client;
  const editableDetail: EditableJobDetail | null = ready
    ? {
        job: {
          id: job.id,
          version: job.version!,
          client_id: job.clientId!,
          title: job.title,
          internal_service_id: job.internalServiceId!,
          priority_id: job.priorityId!,
          pic_id: job.picId!,
          description: job.description ?? '',
          start_date: job.startDateIso || null,
          estimated_end_date: job.deadlineIso || null,
        },
        canManage,
        canChangePic: canDelete,
        statusCode: job.statusCode,
        summary: { client: job.client, internalService: job.internalService, priority: job.priority, pic: job.pic },
        steps: [],
      }
    : null;

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
    setReason('');
    setStatusCode(job.statusCode === 'ON_HOLD' || job.statusCode === 'OBSTACLE' || job.statusCode === 'IN_PROGRESS' ? job.statusCode : 'IN_PROGRESS');
    setStatusOpen(true);
  }

  function saveStatus() {
    if (!job.version) return;
    setError('');
    startTransition(async () => {
      const result = await changeJobStatusAction({ jobId: job.id, version: job.version!, statusCode, reason });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatusOpen(false);
      router.refresh();
    });
  }

  function moveToTrash() {
    if (!job.version || !confirmed) return;
    setError('');
    startTransition(async () => {
      const result = await trashJobAction({ jobId: job.id, version: job.version!, confirmation });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={!ready || (!canManage && !canDelete)}
        aria-label={`Actions for ${job.title}`}
        aria-expanded={Boolean(menu)}
        onClick={(event) => {
          event.stopPropagation();
          toggleMenu();
        }}
        className="rounded-md p-1.5 text-[#8C716D] transition hover:bg-gray-100 hover:text-[#202938] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <EllipsisVertical aria-hidden="true" className="size-4" />
      </button>

      {menu && editableDetail ? (
        <div
          role="menu"
          style={{ top: menu.top, right: menu.right }}
          onMouseDown={(event) => event.stopPropagation()}
          className="fixed z-[65] w-44 rounded-lg border border-[#DEE2E7] bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
        >
          {canManage && job.statusCode !== 'COMPLETED' ? (
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                setEditOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-[#344054] transition hover:bg-[#F6F7F9]"
            >
              <Pencil className="size-3.5" />
              Edit Job
            </button>
          ) : null}
          {canManage ? (
            job.statusCode === 'COMPLETED' ? (
              <Link href={`/admin/all-jobs/${job.id}`} className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-[#344054] hover:bg-[#F6F7F9]">
                <ExternalLink className="size-3.5" />
                Status / Reopen
              </Link>
            ) : (
              <button type="button" onClick={openStatus} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-[#344054] hover:bg-[#F6F7F9]">
                <RefreshCw className="size-3.5" />
                Change Status
              </button>
            )
          ) : null}
          {canDelete ? (
            <>
              <div className="my-1 border-t border-[#ECEEF1]" />
              <button
                type="button"
                onClick={() => {
                  setMenu(null);
                  setConfirmation('');
                  setError('');
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
                Move to Trash
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {editableDetail ? <EditJobButton detail={editableDetail} options={options} hideTrigger open={editOpen} onOpenChange={setEditOpen} /> : null}

      <AdminModal
        open={statusOpen}
        onClose={() => {
          if (!isPending) setStatusOpen(false);
        }}
        title="Change Job Status"
        description="Perubahan status akan tercatat pada Jobs Logging."
        size="sm"
        footer={
          <>
            <button type="button" disabled={isPending} onClick={() => setStatusOpen(false)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || statusCode === job.statusCode || (statusCode !== 'IN_PROGRESS' && !reason.trim())}
              onClick={saveStatus}
              className="h-9 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isPending ? 'Menyimpan…' : 'Save Status'}
            </button>
          </>
        }
      >
        <label htmlFor={`job-status-${job.id}`} className="mb-1 block text-xs font-semibold">
          Status
        </label>
        <select
          id={`job-status-${job.id}`}
          value={statusCode}
          onChange={(event) => setStatusCode(event.target.value as SelectableStatus)}
          className="h-10 w-full rounded-lg border border-[#D6DAE0] px-3 text-sm"
        >
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="OBSTACLE">Obstacle</option>
        </select>
        {statusCode !== 'IN_PROGRESS' ? (
          <>
            <label htmlFor={`job-reason-${job.id}`} className="mt-4 mb-1 block text-xs font-semibold">
              Reason *
            </label>
            <textarea
              id={`job-reason-${job.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-[#D6DAE0] p-3 text-sm outline-none focus:border-[#8C1010]"
            />
          </>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </AdminModal>

      <AdminModal
        open={deleteOpen}
        onClose={() => {
          if (!isPending) setDeleteOpen(false);
        }}
        title="Move Job to Trash"
        description="Job dapat dipulihkan dari Trash. Folder beserta seluruh dokumennya juga akan dipindahkan ke Google Drive Trash."
        size="sm"
        footer={
          <>
            <button type="button" disabled={isPending} onClick={() => setDeleteOpen(false)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">
              Cancel
            </button>
            <button type="button" disabled={isPending || !confirmed} onClick={moveToTrash} className="h-9 rounded bg-red-600 px-5 text-xs font-semibold text-white disabled:opacity-50">
              {isPending ? 'Memindahkan…' : 'Move to Trash'}
            </button>
          </>
        }
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Ketik persis <strong>{job.title}</strong> atau <strong>{job.client}</strong> untuk melanjutkan.
        </div>
        <label htmlFor={`delete-job-${job.id}`} className="mt-4 mb-1.5 block text-xs font-semibold">
          Confirmation
        </label>
        <input
          id={`delete-job-${job.id}`}
          autoComplete="off"
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setError('');
          }}
          className="h-10 w-full rounded-lg border border-[#D6DAE0] px-3 text-sm outline-none focus:border-red-500"
        />
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </AdminModal>
    </>
  );
}
