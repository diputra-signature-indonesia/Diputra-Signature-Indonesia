'use client';

import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import { allJobsFilterOptions, initialAllJobsFilters, type AllJob, type AllJobsFilterState } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';

function optionsFromJobs(jobs: AllJob[], allLabel: string, select: (job: AllJob) => string) {
  return [allLabel, ...Array.from(new Set(jobs.map(select))).sort((a, b) => a.localeCompare(b))];
}

export function AllJobsFilters({ jobs, onApply }: { jobs: AllJob[]; onApply: (filters: AllJobsFilterState) => void }) {
  const [filters, setFilters] = useState(initialAllJobsFilters);

  const updateFilter = <Key extends keyof AllJobsFilterState>(key: Key, value: AllJobsFilterState[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialAllJobsFilters);
    onApply(initialAllJobsFilters);
  };

  return (
    <AdminFilterPanel onReset={resetFilters} onSubmit={() => onApply(filters)} gridClassName="xl:grid-cols-6">
      <label className="block min-w-0 md:col-span-2 xl:col-span-3">
        <span className="mb-1 block text-[11px] font-semibold text-[#202020]">Search Jobs</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => updateFilter('query', event.target.value)}
          placeholder="Job title, client name, or ID..."
          className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-3 text-xs text-[#303846] outline-none transition placeholder:text-[#747D8C] focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10"
        />
      </label>
      <AdminSelectField label="PIC" value={filters.pic} options={optionsFromJobs(jobs, 'All Assignees', (job) => job.pic)} onChange={(value) => updateFilter('pic', value)} />
      <AdminSelectField label="Internal Service" value={filters.internalService} options={optionsFromJobs(jobs, 'All Internal Services', (job) => job.internalService)} onChange={(value) => updateFilter('internalService', value)} />
      <AdminSelectField label="Status" value={filters.status} options={optionsFromJobs(jobs, 'All Statuses', (job) => job.status)} onChange={(value) => updateFilter('status', value)} />

      <fieldset className="min-w-0 md:col-span-2 xl:col-span-2">
        <legend className="mb-1 text-[11px] font-semibold text-[#202020]">Date Range</legend>
        <div className="flex h-9 min-w-0 items-center gap-1 rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-2 text-[#747D8C] focus-within:border-[#A61919] focus-within:ring-2 focus-within:ring-[#A61919]/10">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#98A1B0]" />
          <input
            aria-label="Jobs start date"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[11px] outline-none [color-scheme:light]"
          />
          <span aria-hidden="true" className="text-gray-400">&ndash;</span>
          <input
            aria-label="Jobs end date"
            type="date"
            min={filters.dateFrom || undefined}
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[11px] outline-none [color-scheme:light]"
          />
        </div>
      </fieldset>
      <AdminSelectField label="Priority" value={filters.priority} options={optionsFromJobs(jobs, 'All Priorities', (job) => job.priority)} onChange={(value) => updateFilter('priority', value)} />
      <AdminSelectField label="Deadline" value={filters.deadline} options={allJobsFilterOptions.deadlines} onChange={(value) => updateFilter('deadline', value)} />
      <AdminSelectField label="Group By" value={filters.groupBy} options={allJobsFilterOptions.groupBy} onChange={(value) => updateFilter('groupBy', value)} />
    </AdminFilterPanel>
  );
}
