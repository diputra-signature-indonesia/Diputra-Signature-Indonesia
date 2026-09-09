'use client';

import { allJobs, initialAllJobsFilters, type AllJob, type AllJobsFilterState } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AllJobsFilters } from './all-jobs-filters';
import { AllJobsTable } from './all-jobs-table';

function matchesFilter(job: AllJob, filters: AllJobsFilterState) {
  const query = filters.query.trim().toLowerCase();
  const searchableValue = `${job.title} ${job.client} ${job.id}`.toLowerCase();

  if (query && !searchableValue.includes(query)) return false;
  if (filters.pic !== 'All Assignees' && job.pic !== filters.pic) return false;
  if (filters.category !== 'All Categories' && job.category !== filters.category) return false;
  if (filters.status !== 'All Statuses' && job.status !== filters.status) return false;
  if (filters.priority !== 'All Priorities' && job.priority !== filters.priority) return false;
  if (filters.dateFrom && job.deadlineIso < filters.dateFrom) return false;
  if (filters.dateTo && job.deadlineIso > filters.dateTo) return false;
  if (filters.deadline === 'Overdue' && !job.deadlineNote.toLowerCase().includes('overdue')) return false;
  if (filters.deadline === 'Due Today' && !job.deadlineNote.toLowerCase().includes('today')) return false;
  if (filters.deadline === 'Next 7 Days' && !/(tomorrow|[1-7] day)/i.test(job.deadlineNote)) return false;

  return true;
}

export function AllJobsWorkspace() {
  const [appliedFilters, setAppliedFilters] = useState(initialAllJobsFilters);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredJobs = useMemo(() => {
    const filtered = allJobs.filter((job) => matchesFilter(job, appliedFilters));

    if (appliedFilters.groupBy === 'Client') {
      return [...filtered].sort((left, right) => left.client.localeCompare(right.client));
    }

    return filtered;
  }, [appliedFilters]);

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
      <AllJobsFilters onApply={applyFilters} />
      <div className="px-4 py-5 sm:px-5 lg:px-6">
        <AllJobsTable key={JSON.stringify(appliedFilters)} jobs={filteredJobs} groupBy={appliedFilters.groupBy} isLoading={isLoading} />
      </div>
    </>
  );
}
