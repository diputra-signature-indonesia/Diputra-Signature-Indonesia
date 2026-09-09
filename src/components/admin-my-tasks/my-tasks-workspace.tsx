'use client';

import type { MyTaskJob } from '@/data/admin-my-tasks/my-tasks-dummy-data';
import { useState } from 'react';
import { ClientTasksCard, type TaskStatusFilter } from './client-tasks-card';
import { JobListCard } from './job-list-card';

export function MyTasksWorkspace({ jobs }: { jobs: MyTaskJob[] }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? '');
  const [activeStatus, setActiveStatus] = useState<TaskStatusFilter>('All');
  const [jobQuery, setJobQuery] = useState('');
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0];

  if (!selectedJob) return null;

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveStatus('All');
  };

  return (
    <section className="grid items-start gap-5 px-4 py-5 sm:px-5 lg:px-6 xl:grid-cols-[minmax(0,2.05fr)_minmax(320px,1fr)]">
      <ClientTasksCard job={selectedJob} activeStatus={activeStatus} onStatusChange={setActiveStatus} />
      <JobListCard jobs={jobs} selectedJobId={selectedJob.id} query={jobQuery} onQueryChange={setJobQuery} onJobSelect={handleJobSelect} />
    </section>
  );
}
