import type { MyTaskJob } from '@/data/admin-my-tasks/my-tasks-dummy-data';
import { Clock3, Search, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { MyTaskStatusBadge } from './my-task-status-badge';

type JobListCardProps = {
  jobs: MyTaskJob[];
  selectedJobId: string;
  query: string;
  onQueryChange: (query: string) => void;
  onJobSelect: (jobId: string) => void;
};

export function JobListCard({ jobs, selectedJobId, query, onQueryChange, onJobSelect }: JobListCardProps) {
  const openTotal = jobs.reduce((sum, job) => sum + job.openCount, 0);
  const completedTotal = jobs.reduce((sum, job) => sum + job.completedCount, 0);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleJobs = normalizedQuery ? jobs.filter((job) => `${job.client} ${job.title} ${job.id}`.toLowerCase().includes(normalizedQuery)) : jobs;

  return (
    <aside className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-xl border border-[#DEE2E7] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.05)] xl:max-h-[735px]">
      <div className="px-4 pt-5 pb-4">
        <h2 className="text-xl font-semibold text-[#2A2020]">Job List</h2>
        <p className="mt-1 text-xs text-[#756664]">Select a job to view its assigned tasks.</p>

        <label className="relative mt-3 block">
          <span className="sr-only">Search job list</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#788495]" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Job title, client name, or reference..."
            className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] pr-3 pl-9 text-xs text-[#303846] outline-none transition placeholder:text-[#747D8C] focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10"
          />
        </label>

        <div className="mt-2 rounded-lg border border-[#DEE2E7] px-3 py-2.5">
          <p className="text-xs font-semibold text-[#725650]">All Assigned Tasks</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.04em] text-[#756664]">{openTotal} open · {completedTotal} completed</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#DEE2E7]">
        {visibleJobs.map((job) => {
          const selected = job.id === selectedJobId;
          const DueIcon = job.dueTone === 'urgent' ? TriangleAlert : Clock3;

          return (
            <button
              key={job.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onJobSelect(job.id)}
              className={`w-full border-b border-[#E7E9ED] px-4 py-4 text-left transition hover:bg-[#FFFAF9] ${selected ? 'border-l-2 border-l-[#A61919] bg-[#FFFCFB]' : 'border-l-2 border-l-transparent'}`}
            >
              <p className="truncate text-sm font-semibold text-[#2A2020]">{job.client}</p>
              <p className="mt-0.5 truncate text-xs text-[#756664]">{job.title}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <MyTaskStatusBadge status={job.status} />
                <span className={`flex items-center gap-1 whitespace-nowrap text-[11px] ${job.dueTone === 'urgent' ? 'font-medium text-red-600' : job.dueTone === 'warning' ? 'font-medium text-amber-700' : 'text-[#2A2020]'}`}>
                  <DueIcon aria-hidden="true" className="size-3" />
                  {job.dueLabel}
                </span>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.04em] text-[#756664]">{job.openCount} open · {job.completedCount} completed</p>
            </button>
          );
        })}

        {visibleJobs.length === 0 ? <p className="px-5 py-12 text-center text-sm text-[#8A94A3]">Job tidak ditemukan.</p> : null}
      </div>

      <Link href="/admin/all-jobs" className="flex h-11 shrink-0 items-center justify-center border-t border-[#DEE2E7] text-xs font-semibold text-[#8C1010] transition hover:bg-[#FFF6F6]">
        View All Jobs
      </Link>
    </aside>
  );
}
