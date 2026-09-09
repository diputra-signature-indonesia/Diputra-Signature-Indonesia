'use client';

import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import { myTaskFilterOptions } from '@/data/admin-my-tasks/my-tasks-dummy-data';
import { useState } from 'react';

type MyTasksFilterState = {
  query: string;
  deadline: string;
  category: string;
  status: string;
  sortBy: string;
};

const initialFilters: MyTasksFilterState = {
  query: '',
  deadline: myTaskFilterOptions.deadlines[0],
  category: myTaskFilterOptions.categories[0],
  status: myTaskFilterOptions.statuses[0],
  sortBy: myTaskFilterOptions.sortBy[0],
};

export function MyTasksFilters() {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = <Key extends keyof MyTasksFilterState>(key: Key, value: MyTasksFilterState[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <AdminFilterPanel onReset={() => setFilters(initialFilters)} gridClassName="xl:grid-cols-[2.2fr_0.78fr_0.78fr_0.78fr_0.78fr]">
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-semibold text-[#202020]">Search Jobs</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => updateFilter('query', event.target.value)}
          placeholder="Job title, client name, or reference..."
          className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-3 text-xs text-[#303846] outline-none transition placeholder:text-[#747D8C] focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10"
        />
      </label>
      <AdminSelectField label="Deadline" value={filters.deadline} options={myTaskFilterOptions.deadlines} onChange={(value) => updateFilter('deadline', value)} />
      <AdminSelectField label="Category" value={filters.category} options={myTaskFilterOptions.categories} onChange={(value) => updateFilter('category', value)} />
      <AdminSelectField label="Status" value={filters.status} options={myTaskFilterOptions.statuses} onChange={(value) => updateFilter('status', value)} />
      <AdminSelectField label="Sort By" value={filters.sortBy} options={myTaskFilterOptions.sortBy} onChange={(value) => updateFilter('sortBy', value)} />
    </AdminFilterPanel>
  );
}
