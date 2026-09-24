'use client';

import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import type { MyTaskJob, MyTasksFilterState } from '@/types/admin-my-tasks';

export const initialMyTasksFilters: MyTasksFilterState = {
  query: '', deadline: 'Any Time', internalService: '', status: 'ACTIVE', sortBy: 'Most Urgent',
};

type Props = {
  jobs: MyTaskJob[];
  filters: MyTasksFilterState;
  onChange: (filters: MyTasksFilterState) => void;
  onApply: () => void;
  onReset: () => void;
};

export function MyTasksFilters({ jobs, filters, onChange, onApply, onReset }: Props) {
  const services = [...new Map(jobs.map((job) => [job.internalServiceId, job.internalService])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const statuses = [...new Map(jobs.map((job) => [job.statusCode, job.status])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1]));
  const update = <Key extends keyof MyTasksFilterState>(key: Key, value: MyTasksFilterState[Key]) => onChange({ ...filters, [key]: value });

  return <AdminFilterPanel onReset={onReset} onSubmit={onApply} gridClassName="xl:grid-cols-[2.2fr_0.78fr_0.78fr_0.78fr_0.78fr]">
    <label className="block min-w-0"><span className="mb-1 block text-[11px] font-semibold text-[#202020]">Search Jobs &amp; Tasks</span><input type="search" value={filters.query} onChange={(event) => update('query', event.target.value)} placeholder="Job, task, client, or service..." className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-3 text-xs text-[#303846] outline-none transition placeholder:text-[#747D8C] focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10" /></label>
    <AdminSelectField label="Deadline" value={filters.deadline} options={['Any Time', 'Due Today', 'Next 7 Days', 'Overdue']} onChange={(value) => update('deadline', value)} />
    <AdminSelectField label="Internal Service" value={filters.internalService} options={[{ value: '', label: 'All Internal Services' }, ...services.map(([value, label]) => ({ value, label }))]} onChange={(value) => update('internalService', value)} />
    <AdminSelectField label="Status" value={filters.status} options={[{ value: 'ACTIVE', label: 'Active Job' }, { value: '', label: 'All Jobs' }, ...statuses.map(([value, label]) => ({ value, label }))]} onChange={(value) => update('status', value)} />
    <AdminSelectField label="Sort By" value={filters.sortBy} options={['Most Urgent', 'Newest', 'Client Name']} onChange={(value) => update('sortBy', value)} />
  </AdminFilterPanel>;
}
