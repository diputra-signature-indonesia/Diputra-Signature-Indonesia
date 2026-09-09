import type { MyTaskJob, MyTaskStatus } from '@/data/admin-my-tasks/my-tasks-dummy-data';
import { ChevronRight, EllipsisVertical } from 'lucide-react';
import Link from 'next/link';
import { MyTaskStatusBadge } from './my-task-status-badge';

export type TaskStatusFilter = 'All' | MyTaskStatus;

const statusOrder: MyTaskStatus[] = ['In Progress', 'On Hold', 'Obstacle', 'Not Started', 'Completed'];

type ClientTasksCardProps = {
  job: MyTaskJob;
  activeStatus: TaskStatusFilter;
  onStatusChange: (status: TaskStatusFilter) => void;
};

export function ClientTasksCard({ job, activeStatus, onStatusChange }: ClientTasksCardProps) {
  const visibleTasks = activeStatus === 'All' ? job.tasks : job.tasks.filter((task) => task.status === activeStatus);
  const statusCounts = Object.fromEntries(statusOrder.map((status) => [status, job.tasks.filter((task) => task.status === status).length])) as Record<MyTaskStatus, number>;

  return (
    <section className="min-w-0 rounded-xl border border-[#DEE2E7] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/all-jobs?job=${job.id}`} className="group inline-flex min-w-0 items-center gap-2 text-[#A94141] hover:text-[#8C1010]">
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
          All ({job.tasks.length})
        </button>
        {statusOrder.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={activeStatus === status}
            onClick={() => onStatusChange(status)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${activeStatus === status ? 'border-[#2F2020] bg-[#2F2020] text-white' : 'border-[#E7BBB4] bg-[#FFF9F8] text-[#725650] hover:bg-[#FFF2F0]'}`}
          >
            {status} ({statusCounts[status]})
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#DEE2E7]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead className="bg-white text-xs font-semibold uppercase tracking-[0.04em] text-[#756664]">
              <tr>
                <th className="w-[58%] px-6 py-4">Task Detail</th>
                <th className="px-4 py-4">Deadline</th>
                <th className="px-4 py-4">Status</th>
                <th className="w-12 px-3 py-4"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.id} className="border-t border-[#E7E9ED] text-sm text-[#3D3D3D] transition hover:bg-[#FCFCFD]">
                  <td className="px-6 py-5 font-semibold leading-4">{task.detail}</td>
                  <td className="whitespace-nowrap px-4 py-5 text-xs">
                    <p>{task.deadline}</p>
                    <p className={`mt-1 text-[10px] ${task.deadlineNote === 'Completed' ? 'text-emerald-600' : 'text-red-500'}`}>({task.deadlineNote})</p>
                  </td>
                  <td className="px-4 py-5"><MyTaskStatusBadge status={task.status} /></td>
                  <td className="px-3 py-5 text-center">
                    <button type="button" aria-label={`Actions for ${task.detail}`} className="rounded-md p-1.5 text-[#8C716D] transition hover:bg-gray-100 hover:text-[#202938]">
                      <EllipsisVertical aria-hidden="true" className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleTasks.length === 0 ? <p className="border-t border-[#E7E9ED] px-6 py-12 text-center text-sm text-[#8A94A3]">Tidak ada task dengan status ini.</p> : null}
      </div>
    </section>
  );
}
