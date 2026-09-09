'use client';

import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import {
  taskAssignmentFilterOptions,
  type TaskAssignmentFilterState,
} from '@/data/admin-job-detail/task-assignment-dummy-data';
import { CalendarDays } from 'lucide-react';

type TaskAssignmentFiltersProps = {
  filters: TaskAssignmentFilterState;
  onChange: (filters: TaskAssignmentFilterState) => void;
  onApply: () => void;
  onReset: () => void;
};

export function TaskAssignmentFilters({ filters, onChange, onApply, onReset }: TaskAssignmentFiltersProps) {
  const updateFilter = <Key extends keyof TaskAssignmentFilterState>(key: Key, value: TaskAssignmentFilterState[Key]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <AdminFilterPanel onReset={onReset} onSubmit={onApply} gridClassName="xl:grid-cols-[2.1fr_1.05fr_1.65fr_0.95fr_0.95fr]">
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-semibold text-[#202020]">Search Tasks</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => updateFilter('query', event.target.value)}
          placeholder="Task title, assignee, or reference..."
          className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-3 text-xs text-[#303846] outline-none transition placeholder:text-[#747D8C] focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10"
        />
      </label>

      <AdminSelectField label="PIC" value={filters.pic} options={taskAssignmentFilterOptions.pics} onChange={(value) => updateFilter('pic', value)} />

      <fieldset className="min-w-0">
        <legend className="mb-1 text-[11px] font-semibold text-[#202020]">Date Range</legend>
        <div className="flex h-9 min-w-0 items-center gap-1 rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-2 text-[#747D8C] focus-within:border-[#A61919] focus-within:ring-2 focus-within:ring-[#A61919]/10">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#98A1B0]" />
          <input
            aria-label="Tasks start date"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[10px] outline-none [color-scheme:light]"
          />
          <span aria-hidden="true" className="text-gray-400">&ndash;</span>
          <input
            aria-label="Tasks end date"
            type="date"
            min={filters.dateFrom || undefined}
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[10px] outline-none [color-scheme:light]"
          />
        </div>
      </fieldset>

      <AdminSelectField label="Status" value={filters.status} options={taskAssignmentFilterOptions.statuses} onChange={(value) => updateFilter('status', value)} />
      <AdminSelectField label="Priority" value={filters.priority} options={taskAssignmentFilterOptions.priorities} onChange={(value) => updateFilter('priority', value)} />
    </AdminFilterPanel>
  );
}
