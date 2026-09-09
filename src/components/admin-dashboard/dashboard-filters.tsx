'use client';

import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import { dashboardFilterOptions } from '@/data/admin-dashboard/dashboard-dummy-data';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';

type DashboardFilterState = {
  pic: string;
  client: string;
  status: string;
  category: string;
  dateFrom: string;
  dateTo: string;
};

const initialFilters: DashboardFilterState = {
  pic: dashboardFilterOptions.pics[0],
  client: dashboardFilterOptions.clients[0],
  status: dashboardFilterOptions.statuses[0],
  category: dashboardFilterOptions.categories[0],
  dateFrom: '',
  dateTo: '',
};

export function DashboardFilters() {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = <Key extends keyof DashboardFilterState>(key: Key, value: DashboardFilterState[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <AdminFilterPanel onReset={() => setFilters(initialFilters)} gridClassName="xl:grid-cols-[1.05fr_1.05fr_0.64fr_0.92fr_1.17fr]">
      <AdminSelectField label="PIC" value={filters.pic} options={dashboardFilterOptions.pics} onChange={(value) => updateFilter('pic', value)} />
      <AdminSelectField label="Client" value={filters.client} options={dashboardFilterOptions.clients} onChange={(value) => updateFilter('client', value)} />
      <AdminSelectField label="Status" value={filters.status} options={dashboardFilterOptions.statuses} onChange={(value) => updateFilter('status', value)} />
      <AdminSelectField label="Category" value={filters.category} options={dashboardFilterOptions.categories} onChange={(value) => updateFilter('category', value)} />

      <fieldset className="min-w-0 md:col-span-2 xl:col-span-1">
        <legend className="mb-1 text-[11px] font-semibold text-[#202020]">Date Range</legend>
        <div className="flex h-9 min-w-0 items-center gap-1 rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-2 text-[#747D8C] focus-within:border-[#A61919] focus-within:ring-2 focus-within:ring-[#A61919]/10">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#98A1B0]" />
          <input
            aria-label="Start date"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[11px] outline-none [color-scheme:light]"
          />
          <span aria-hidden="true" className="text-gray-400">&ndash;</span>
          <input
            aria-label="End date"
            type="date"
            min={filters.dateFrom || undefined}
            value={filters.dateTo}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[11px] outline-none [color-scheme:light]"
          />
        </div>
      </fieldset>
    </AdminFilterPanel>
  );
}
