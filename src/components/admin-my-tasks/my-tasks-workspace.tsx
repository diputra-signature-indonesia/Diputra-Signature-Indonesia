'use client';

import type { MyTaskJob } from '@/types/admin-my-tasks';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ClientTasksCard, type TaskStatusFilter } from './client-tasks-card';
import { JobListCard } from './job-list-card';
import { initialMyTasksFilters, MyTasksFilters } from './my-tasks-filters';

function todayInMakassar() {
  const parts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Makassar' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function MyTasksWorkspace({ jobs }: { jobs: MyTaskJob[] }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? '');
  const [activeStatus, setActiveStatus] = useState<TaskStatusFilter>('All');
  const [jobQuery, setJobQuery] = useState('');
  const [draftFilters, setDraftFilters] = useState(initialMyTasksFilters);
  const [filters, setFilters] = useState(initialMyTasksFilters);

  const filteredJobs = useMemo(() => {
    const today = todayInMakassar();
    const query = filters.query.trim().toLocaleLowerCase();
    return jobs.filter((job) => {
      const searchableValue = `${job.title} ${job.client} ${job.internalService} ${job.tasks.map((task) => task.detail).join(' ')}`.toLocaleLowerCase();
      if (query && !searchableValue.includes(query)) return false;
      if (filters.internalService && job.internalServiceId !== filters.internalService) return false;
      if (filters.status === 'ACTIVE' && job.statusCode === 'COMPLETED') return false;
      if (filters.status && filters.status !== 'ACTIVE' && job.statusCode !== filters.status) return false;
      if (filters.deadline !== 'Any Time') {
        if (!job.dueDate) return false;
        const days = Math.round((Date.parse(`${job.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
        if (filters.deadline === 'Overdue' && days >= 0) return false;
        if (filters.deadline === 'Due Today' && days !== 0) return false;
        if (filters.deadline === 'Next 7 Days' && (days < 0 || days > 7)) return false;
      }
      return true;
    }).sort((left, right) => {
      if (filters.sortBy === 'Newest') return right.createdAt.localeCompare(left.createdAt);
      if (filters.sortBy === 'Client Name') return left.client.localeCompare(right.client);
      return (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31') || left.client.localeCompare(right.client);
    });
  }, [jobs, filters]);

  const selectedJob = filteredJobs.find((job) => job.id === selectedJobId) ?? filteredJobs[0];
  const effectiveStatus = selectedJob && (activeStatus === 'All' || selectedJob.statuses.some((status) => status.id === activeStatus)) ? activeStatus : 'All';

  return <>
    <MyTasksFilters jobs={jobs} filters={draftFilters} onChange={setDraftFilters} onApply={() => setFilters(draftFilters)} onReset={() => { setDraftFilters(initialMyTasksFilters); setFilters(initialMyTasksFilters); }} />
    {selectedJob ? <section className="grid items-start gap-5 px-4 py-5 sm:px-5 lg:px-6 xl:grid-cols-[minmax(0,2.05fr)_minmax(320px,1fr)]">
      <ClientTasksCard job={selectedJob} searchQuery={filters.query} activeStatus={effectiveStatus} onStatusChange={setActiveStatus} />
      <JobListCard jobs={filteredJobs} selectedJobId={selectedJob.id} query={jobQuery} onQueryChange={setJobQuery} onJobSelect={(jobId) => { setSelectedJobId(jobId); setActiveStatus('All'); }} />
    </section> : <section className="mx-4 my-5 rounded-xl border border-[#DEE2E7] bg-white px-6 py-16 text-center shadow-sm sm:mx-5 lg:mx-6">
      <h2 className="text-lg font-semibold text-[#202938]">{jobs.length ? 'Tidak ada Job sesuai filter' : 'Belum ada Task untuk Anda'}</h2>
      <p className="mt-2 text-sm text-[#68717E]">{jobs.length ? 'Ubah atau reset filter untuk melihat Job lainnya.' : 'Job yang Anda tangani sebagai PIC atau memiliki Task yang ditugaskan kepada Anda akan tampil di sini.'}</p>
      {!jobs.length ? <Link href="/admin/all-jobs" className="mt-5 inline-flex rounded-lg border border-[#8C1010] px-4 py-2 text-xs font-semibold text-[#8C1010] hover:bg-[#FFF6F6]">Lihat All Jobs</Link> : null}
    </section>}
  </>;
}
