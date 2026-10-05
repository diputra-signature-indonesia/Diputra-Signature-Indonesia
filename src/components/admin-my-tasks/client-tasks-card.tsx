'use client';

import { AllJobsPagination } from '@/components/admin-all-jobs/all-jobs-pagination';
import type { MyTaskJob } from '@/types/admin-my-tasks';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MyTaskStatusBadge } from './my-task-status-badge';
import { TaskRowActions, type MyTaskAction } from './task-row-actions';
import { TaskActionModal } from './task-action-modal';

export type TaskStatusFilter = 'All' | string;

type ClientTasksCardProps = {
  job: MyTaskJob;
  searchQuery: string;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onSaved: () => void;
  activeStatus: TaskStatusFilter;
  onStatusChange: (status: TaskStatusFilter) => void;
};

export function ClientTasksCard({ job, activeStatus, onStatusChange, page, total, onPageChange, onSaved }: ClientTasksCardProps) {
  const [selection, setSelection] = useState<{ taskId: string; mode: MyTaskAction } | null>(null);
  const [notice, setNotice] = useState('');
  const selectedTask = job.tasks.find((task) => task.id === selection?.taskId);
  const visibleTasks = job.tasks;

  return (
    <section className="min-w-0 rounded-xl border border-[#DEE2E7] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/all-jobs/${job.id}`} className="group inline-flex min-w-0 items-center gap-2 text-[#A94141] hover:text-[#8C1010]">
              <h2 className="truncate text-xl font-semibold">Tasks - {job.client}</h2>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full bg-[#F7E5E2] px-2 text-[11px] font-semibold text-[#98615A]">{job.badgeNumber}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-[#242424]">{job.title}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter tasks by status">
        <button
          type="button"
          aria-pressed={activeStatus === 'All'}
          onClick={() => onStatusChange('All')}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${activeStatus === 'All' ? 'border-[#2F2020] bg-[#2F2020] text-white' : 'border-[#E7BBB4] bg-[#FFF9F8] text-[#725650] hover:bg-[#FFF2F0]'}`}
        >
          All ({job.statuses.reduce((sum, status) => sum + (status.count ?? 0), 0)})
        </button>
        {job.statuses.map((status) => (
          <button
            key={status.id}
            type="button"
            aria-pressed={activeStatus === status.id}
            onClick={() => onStatusChange(status.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${activeStatus === status.id ? 'border-[#2F2020] bg-[#2F2020] text-white' : 'border-[#E7BBB4] bg-[#FFF9F8] text-[#725650] hover:bg-[#FFF2F0]'}`}
          >
            {status.name} ({status.count ?? 0})
          </button>
        ))}
      </div>

      {notice ? (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}
      <div className="mt-5 overflow-hidden rounded-xl border border-[#DEE2E7]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead className="bg-white text-xs font-semibold tracking-[0.04em] text-[#756664] uppercase">
              <tr>
                <th className="w-[58%] px-6 py-4">Task Detail</th>
                <th className="px-4 py-4">Deadline</th>
                <th className="px-4 py-4">Status</th>
                <th className="w-12 px-3 py-4">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.id} className="border-t border-[#E7E9ED] text-sm text-[#3D3D3D] transition hover:bg-[#FCFCFD]">
                  <td className="px-6 py-5 leading-4 font-semibold">{task.detail}</td>
                  <td className="px-4 py-5 text-xs whitespace-nowrap">
                    <p>{task.deadline}</p>
                    <p className={`mt-1 text-[10px] ${task.deadlineNote === 'Completed' ? 'text-emerald-600' : 'text-red-500'}`}>({task.deadlineNote})</p>
                  </td>
                  <td className="px-4 py-5">
                    <MyTaskStatusBadge status={task.status} code={task.statusCode} />
                  </td>
                  <td className="px-3 py-5 text-center">
                    <TaskRowActions
                      title={task.detail}
                      canChangeStatus={task.canChangeStatus}
                      onAction={(mode) => {
                        setNotice('');
                        setSelection({ taskId: task.id, mode });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleTasks.length === 0 ? <p className="border-t border-[#E7E9ED] px-6 py-12 text-center text-sm text-[#8A94A3]">Tidak ada task dengan status ini.</p> : null}
      </div>
      <AllJobsPagination noun="tasks" currentPage={page} pageSize={10} totalItems={total} onPageChange={onPageChange} />
      {selectedTask && selection ? (
        <TaskActionModal
          key={`${selectedTask.id}-${selection.mode}`}
          job={job}
          task={selectedTask}
          mode={selection.mode}
          onClose={() => setSelection(null)}
          onChangeStatus={() => setSelection({ taskId: selectedTask.id, mode: 'status' })}
          onSaved={() => {
            setNotice('Status Task berhasil diperbarui.');
            onSaved();
          }}
        />
      ) : null}
    </section>
  );
}
