'use client';

import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import {
  ALL_JOB_STATUS_FILTER,
  COMPLETED_JOB_STATUS_FILTER,
  UNFINISHED_JOB_STATUS_FILTER,
  allJobsFilterOptions,
  emptyAllJobsFilters,
  initialAllJobsFilters,
  type AllJobsFilterState,
} from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { AdminRemoteSelect } from '@/components/layout-admin/admin-remote-select';
import type { AddJobOptions } from '@/lib/supabase/queries/add-job';

export function AllJobsFilters({ options, onApply }: { options: AddJobOptions; onApply: (filters: AllJobsFilterState) => void }) {
  const [filters, setFilters] = useState(initialAllJobsFilters);
  const statusOptions = [
    { value: ALL_JOB_STATUS_FILTER, label: 'All Statuses' },
    { value: UNFINISHED_JOB_STATUS_FILTER, label: 'Unfinished Jobs' },
    { value: COMPLETED_JOB_STATUS_FILTER, label: 'Completed Jobs' },
    ...options.statuses.filter((status) => status.code !== 'COMPLETED').map((status) => ({ value: `STATUS:${status.code}`, label: status.name })),
  ];

  const updateFilter = <Key extends keyof AllJobsFilterState>(key: Key, value: AllJobsFilterState[Key]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onApply(next);
  };

  const resetFilters = () => {
    setFilters(emptyAllJobsFilters);
    onApply(emptyAllJobsFilters);
  };

  const inputClass = (active: boolean) =>
    `h-9 w-full rounded-lg border px-3 text-xs outline-none transition placeholder:text-[#747D8C] focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10 ${active ? 'border-[#E4C756] bg-[#FFFBEA] text-[#5E5120]' : 'border-[#DEE2E7] bg-[#F5F6F8] text-[#303846]'}`;

  return (
    <AdminFilterPanel onReset={resetFilters} onSubmit={() => onApply(filters)} gridClassName="xl:grid-cols-6">
      <label className="block min-w-0 md:col-span-2 xl:col-span-3">
        <span className="mb-1 block text-[11px] font-semibold text-[#202020]">Search Jobs</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => updateFilter('query', event.target.value)}
          placeholder="Job, client, PIC, or service..."
          className={inputClass(Boolean(filters.query.trim()))}
        />
      </label>
      <AdminRemoteSelect
        kind="profiles"
        label="PIC"
        value={filters.pic.startsWith('All ') ? '' : filters.pic}
        placeholder="All Assignees"
        onChange={(value) => updateFilter('pic', value || 'All Assignees')}
      />
      <AdminRemoteSelect
        kind="service_filters"
        label="Internal Service"
        value={filters.internalService.startsWith('All ') ? '' : filters.internalService}
        placeholder="All Internal Services"
        onChange={(value) => updateFilter('internalService', value || 'All Internal Services')}
      />
      <AdminSelectField active={filters.status !== ALL_JOB_STATUS_FILTER} label="Status" value={filters.status} options={statusOptions} onChange={(value) => updateFilter('status', value)} />

      <fieldset className="min-w-0 md:col-span-2 xl:col-span-2">
        <legend className="mb-1 text-[11px] font-semibold text-[#202020]">Date Range</legend>
        <div
          className={`flex h-9 min-w-0 items-center gap-1 rounded-lg border px-2 text-[#747D8C] transition focus-within:border-[#A61919] focus-within:ring-2 focus-within:ring-[#A61919]/10 ${filters.dateFrom || filters.dateTo ? 'border-[#E4C756] bg-[#FFFBEA]' : 'border-[#DEE2E7] bg-[#F5F6F8]'}`}
        >
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#98A1B0]" />
          <input
            aria-label="Jobs start date"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[11px] [color-scheme:light] outline-none"
          />
          <span aria-hidden="true" className="text-gray-400">
            &ndash;
          </span>
          <input
            aria-label="Jobs end date"
            type="date"
            min={filters.dateFrom || undefined}
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[11px] [color-scheme:light] outline-none"
          />
        </div>
      </fieldset>
      <AdminSelectField
        active={filters.priority !== 'All Priorities'}
        label="Priority"
        value={filters.priority}
        options={[{ value: 'All Priorities', label: 'All Priorities' }, ...options.priorities.map((item) => ({ value: item.id, label: item.name }))]}
        onChange={(value) => updateFilter('priority', value)}
      />
      <AdminSelectField
        active={filters.deadline !== 'Any Time'}
        label="Deadline"
        value={filters.deadline}
        options={allJobsFilterOptions.deadlines}
        onChange={(value) => updateFilter('deadline', value)}
      />
      <AdminSelectField active={filters.groupBy !== 'None'} label="Group By" value={filters.groupBy} options={allJobsFilterOptions.groupBy} onChange={(value) => updateFilter('groupBy', value)} />
    </AdminFilterPanel>
  );
}
