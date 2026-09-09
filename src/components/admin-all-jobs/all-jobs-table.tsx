'use client';

import type { AllJob, AllJobPriority, AllJobStatus } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { ChevronDown, ChevronRight, EllipsisVertical } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useState, type MouseEvent } from 'react';
import { AllJobsPagination } from './all-jobs-pagination';
import { AllJobsTableLoading } from './all-jobs-table-loading';

const PAGE_SIZE = 10;

const statusStyles: Record<AllJobStatus, string> = {
  'In Progress': 'border-[#E4B400] bg-[#FFF9E8] text-[#6C5600]',
  'On Hold': 'border-[#194DB8] bg-[#EAF1FF] text-[#073A98]',
  'Not Started': 'border-[#8A94A3] bg-[#F6F7F8] text-[#667080]',
  Obstacle: 'border-[#E33434] bg-[#FFF0F0] text-[#B51414]',
  Completed: 'border-[#1CA35B] bg-[#EDFBF3] text-[#14864B]',
};

const priorityStyles: Record<AllJobPriority, string> = {
  High: 'bg-[#FFDADA] text-[#C32929]',
  Medium: 'bg-[#FFF1C9] text-[#8A7100]',
  Low: 'bg-[#E7F6EC] text-[#23834D]',
};

function StatusBadge({ status }: { status: AllJobStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-semibold uppercase ${statusStyles[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: AllJobPriority }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold uppercase ${priorityStyles[priority]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {priority}
    </span>
  );
}

type AllJobsTableProps = {
  jobs: AllJob[];
  groupBy: string;
  isLoading: boolean;
};

export function AllJobsTable({ jobs, groupBy, isLoading }: AllJobsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(jobs[0]?.id ?? null);

  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleJobs = jobs.slice(pageStart, pageStart + PAGE_SIZE);

  const changePage = (page: number) => {
    setCurrentPage(page);
    setExpandedJobId(null);
  };

  const toggleJob = (jobId: string) => {
    setExpandedJobId((current) => (current === jobId ? null : jobId));
  };

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, jobId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea, [data-no-accordion]')) return;

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    toggleJob(jobId);
  };

  if (isLoading) return <AllJobsTableLoading />;

  return (
    <section className="overflow-hidden rounded-xl border border-[#DEE2E7] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead className="bg-white text-xs font-semibold uppercase tracking-[0.04em] text-[#756664]">
            <tr>
              <th className="w-[30%] px-4 py-4 pl-11">Job Details</th>
              <th className="px-3 py-4">PIC</th>
              <th className="px-3 py-4">Category</th>
              <th className="w-[15%] px-3 py-4">Progress</th>
              <th className="px-3 py-4">Deadline</th>
              <th className="px-3 py-4">Status</th>
              <th className="px-3 py-4">Priority</th>
              <th className="w-12 px-3 py-4"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((job, index) => {
              const expanded = expandedJobId === job.id;
              const detailsId = `details-${job.id}`;
              const showClientHeading = groupBy === 'Client' && (index === 0 || visibleJobs[index - 1]?.client !== job.client);

              return (
                <Fragment key={job.id}>
                  {showClientHeading ? (
                    <tr className="border-t border-[#D9DCE1] bg-[#EEEEEF]">
                      <th colSpan={8} scope="rowgroup" className="px-10 py-3 text-left text-xs font-semibold uppercase tracking-[0.03em] text-[#A94141]">
                        {job.client}
                      </th>
                    </tr>
                  ) : null}

                  <tr
                    onClick={(event) => handleRowClick(event, job.id)}
                    className="cursor-pointer select-text border-t border-[#E7E9ED] text-xs text-[#3D3D3D] transition hover:bg-[#FCFCFD]"
                  >
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${job.title}`}
                          aria-expanded={expanded}
                          aria-controls={detailsId}
                          onClick={() => toggleJob(job.id)}
                          className="flex size-5 shrink-0 items-center justify-center rounded text-[#A94141] transition hover:bg-[#FDEAEA]"
                        >
                          {expanded ? <ChevronDown aria-hidden="true" className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />}
                        </button>
                        <div className="min-w-0">
                          <Link href={`/admin/all-jobs/${job.id}`} className="group inline-flex max-w-full items-center gap-1 text-sm font-semibold text-[#333333] transition hover:text-[#8C1010]">
                            <span className="truncate">{job.title}</span>
                            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                          <p className="mt-0.5 truncate text-[10px] uppercase text-[#4F4F4F]">{job.client}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#B44343] text-[10px] font-semibold text-white">{job.picInitials}</span>
                        <span className="font-medium">{job.pic}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">{job.category}</td>
                    <td className="px-3 py-4">
                      <p className="mb-1.5 text-[10px]">{job.stage} {job.progress}%</p>
                      <div className="h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-[#E1E3E6]">
                        <div className="h-full rounded-full bg-[#B44343]" style={{ width: `${job.progress}%` }} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <p>{job.deadline}</p>
                      <p className={`mt-1 text-[10px] ${job.deadlineNote === 'Completed' ? 'text-emerald-600' : 'text-red-500'}`}>({job.deadlineNote})</p>
                    </td>
                    <td className="px-3 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-3 py-4"><PriorityBadge priority={job.priority} /></td>
                    <td className="px-3 py-4 text-center">
                      <button type="button" aria-label={`Actions for ${job.title}`} className="rounded-md p-1.5 text-[#8C716D] transition hover:bg-gray-100 hover:text-[#202938]">
                        <EllipsisVertical aria-hidden="true" className="size-4" />
                      </button>
                    </td>
                  </tr>

                  {expanded ? (
                    <tr id={detailsId} className="border-t border-[#E7E9ED] bg-[#FBFBFC]">
                      <td colSpan={8} className="px-12 py-4">
                        <div className="grid gap-4 border-l-4 border-[#B85B5B] pl-8 text-xs sm:grid-cols-2 lg:grid-cols-[0.75fr_0.75fr_0.75fr_2.4fr]">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.05em] text-[#A0A0A0]">Start Date</p>
                            <p className="mt-1 text-[#333333]">{job.startDate}</p>
                          </div>
                          <div className="border-gray-200 lg:border-l lg:pl-4">
                            <p className="text-[9px] uppercase tracking-[0.05em] text-[#A0A0A0]">Est. End Date</p>
                            <p className="mt-1 text-[#333333]">{job.estimatedEndDate}</p>
                          </div>
                          <div className="border-gray-200 lg:border-l lg:pl-4">
                            <p className="text-[9px] uppercase tracking-[0.05em] text-[#A0A0A0]">Est. Duration</p>
                            <p className="mt-1 text-[#333333]">{job.estimatedDuration}</p>
                          </div>
                          <div className="border-gray-200 lg:border-l lg:pl-4">
                            <p className="text-[9px] uppercase tracking-[0.05em] text-[#A0A0A0]">Latest Update · by {job.updatedBy} · {job.updatedAgo}</p>
                            <p className="mt-1 text-[#333333]">{job.latestUpdate}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {jobs.length === 0 ? <p className="border-t border-[#DEE2E7] px-6 py-16 text-center text-sm text-[#8A94A3]">Tidak ada job yang sesuai dengan filter.</p> : null}

      <AllJobsPagination currentPage={currentPage} pageSize={PAGE_SIZE} totalItems={jobs.length} onPageChange={changePage} />
    </section>
  );
}
