'use client';

import {
  ALL_JOB_STATUS_FILTER,
  COMPLETED_JOB_STATUS_FILTER,
  UNFINISHED_JOB_STATUS_FILTER,
  allJobsDummy,
  initialAllJobsFilters,
  type AllJob,
  type AllJobsFilterState,
} from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AllJobsFilters } from './all-jobs-filters';
import { AllJobsTable } from './all-jobs-table';

function todayInMakassar() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Makassar',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function dummyDeadlineNote(job: AllJob, today: string) {
  if (job.status === 'Completed') return 'Completed';
  const days = daysUntil(job.deadlineIso, today);
  if (days < 0) return `Overdue ${-days} ${-days === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Due Today';
  if (days === 1) return 'Due Tomorrow';
  return `Due in ${days} days`;
}

function matchesFilter(job: AllJob, filters: AllJobsFilterState) {
  const query = filters.query.trim().toLowerCase();
  const searchableValue = `${job.title} ${job.client} ${job.pic} ${job.internalService} ${job.status} ${job.priority}`.toLowerCase();

  if (query && !searchableValue.includes(query)) return false;
  if (filters.pic !== 'All Assignees' && job.pic !== filters.pic) return false;
  if (filters.internalService !== 'All Internal Services' && job.internalService !== filters.internalService) return false;
  if (filters.status === UNFINISHED_JOB_STATUS_FILTER && job.statusCode === 'COMPLETED') return false;
  if (filters.status === COMPLETED_JOB_STATUS_FILTER && job.statusCode !== 'COMPLETED') return false;
  if (filters.status.startsWith('STATUS:') && job.statusCode !== filters.status.slice('STATUS:'.length)) return false;
  if (![ALL_JOB_STATUS_FILTER, UNFINISHED_JOB_STATUS_FILTER, COMPLETED_JOB_STATUS_FILTER].includes(filters.status) && !filters.status.startsWith('STATUS:') && job.status !== filters.status) return false;
  if (filters.priority !== 'All Priorities' && job.priority !== filters.priority) return false;
  if (filters.dateFrom && (!job.deadlineIso || job.deadlineIso < filters.dateFrom)) return false;
  if (filters.dateTo && (!job.deadlineIso || job.deadlineIso > filters.dateTo)) return false;
  if (filters.deadline !== 'Any Time') {
    if (!job.deadlineIso || job.deadlineNote === 'Completed') return false;
    const days = daysUntil(job.deadlineIso, todayInMakassar());
    if (filters.deadline === 'Overdue' && days >= 0) return false;
    if (filters.deadline === 'Due Today' && days !== 0) return false;
    if (filters.deadline === 'Next 7 Days' && (days < 1 || days > 7)) return false;
  }

  return true;
}

function compareUnfinishedJobs(left: AllJob, right: AllJob) {
  const monthStart = `${todayInMakassar().slice(0, 7)}-01`;
  const leftCarryOver = left.periodDateIso < monthStart;
  const rightCarryOver = right.periodDateIso < monthStart;
  if (leftCarryOver !== rightCarryOver) return leftCarryOver ? -1 : 1;

  const periodOrder = left.periodDateIso.localeCompare(right.periodDateIso);
  if (periodOrder !== 0) return periodOrder;

  if (left.deadlineIso && right.deadlineIso) return left.deadlineIso.localeCompare(right.deadlineIso);
  if (left.deadlineIso) return -1;
  if (right.deadlineIso) return 1;
  return left.title.localeCompare(right.title);
}

function groupValue(job: AllJob, groupBy: string) {
  if (groupBy === 'Client') return job.client;
  if (groupBy === 'PIC') return job.pic;
  if (groupBy === 'Internal Service') return job.internalService;
  if (groupBy === 'Status') return job.status;
  if (groupBy === 'Priority') return job.priority;
  return '';
}

export function AllJobsWorkspace({ realJobs, showDemoJobs }: { realJobs: AllJob[]; showDemoJobs: boolean }) {
  const jobs = useMemo(() => {
    const today = todayInMakassar();
    return showDemoJobs ? [...realJobs, ...allJobsDummy.map((job) => ({ ...job, deadlineNote: dummyDeadlineNote(job, today) }))] : realJobs;
  }, [realJobs, showDemoJobs]);
  const [appliedFilters, setAppliedFilters] = useState(initialAllJobsFilters);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter((job) => matchesFilter(job, appliedFilters));

    if (appliedFilters.groupBy !== 'None') {
      return [...filtered].sort((left, right) => {
        const groupOrder = groupValue(left, appliedFilters.groupBy).localeCompare(groupValue(right, appliedFilters.groupBy));
        if (groupOrder !== 0) return groupOrder;
        return appliedFilters.status === UNFINISHED_JOB_STATUS_FILTER ? compareUnfinishedJobs(left, right) : 0;
      });
    }

    return appliedFilters.status === UNFINISHED_JOB_STATUS_FILTER ? [...filtered].sort(compareUnfinishedJobs) : filtered;
  }, [appliedFilters, jobs]);

  useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    };
  }, []);

  const applyFilters = (nextFilters: AllJobsFilterState) => {
    setIsLoading(true);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);

    loadingTimer.current = setTimeout(() => {
      setAppliedFilters(nextFilters);
      setIsLoading(false);
    }, 450);
  };

  return (
    <>
      <AllJobsFilters jobs={jobs} onApply={applyFilters} />
      <div className="px-4 py-5 sm:px-5 lg:px-6">
        <AllJobsTable key={JSON.stringify(appliedFilters)} jobs={filteredJobs} groupBy={appliedFilters.groupBy} isLoading={isLoading} />
      </div>
    </>
  );
}
