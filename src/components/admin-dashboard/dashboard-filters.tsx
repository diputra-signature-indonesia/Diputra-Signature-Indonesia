'use client';

import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import type { DashboardFilterOptions } from '@/types/admin-dashboard';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';

export type DashboardFilterState = {
  pic: string;
  client: string;
  status: string;
  internalService: string;
  dateFrom: string;
  dateTo: string;
};

export const initialDashboardFilters: DashboardFilterState = {
  pic: '',
  client: '',
  status: '',
  internalService: '',
  dateFrom: '',
  dateTo: '',
};

export function DashboardFilters({ options, onApply }: { options: DashboardFilterOptions; onApply: (filters: DashboardFilterState) => void }) {
  const [filters, setFilters] = useState(initialDashboardFilters);

  const updateFilter = <Key extends keyof DashboardFilterState>(key: Key, value: DashboardFilterState[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <AdminFilterPanel
      onReset={() => { setFilters(initialDashboardFilters); onApply(initialDashboardFilters); }}
      onSubmit={() => onApply(filters)}
      gridClassName="xl:grid-cols-[1.05fr_1.05fr_0.64fr_0.92fr_1.17fr]"
    >
      <AdminSelectField label="PIC" value={filters.pic} active={Boolean(filters.pic)} options={[{ value: '', label: 'All Assignees' }, ...options.pics]} onChange={(value) => updateFilter('pic', value)} />
      <AdminSelectField label="Client" value={filters.client} active={Boolean(filters.client)} options={[{ value: '', label: 'All Clients' }, ...options.clients]} onChange={(value) => updateFilter('client', value)} />
      <AdminSelectField label="Status" value={filters.status} active={Boolean(filters.status)} options={[{ value: '', label: 'All Statuses' }, ...options.statuses]} onChange={(value) => updateFilter('status', value)} />
      <AdminSelectField label="Internal Service" value={filters.internalService} active={Boolean(filters.internalService)} options={[{ value: '', label: 'All Internal Services' }, ...options.internalServices]} onChange={(value) => updateFilter('internalService', value)} />

      <fieldset className="min-w-0 md:col-span-2 xl:col-span-1">
        <legend className="mb-1 text-[11px] font-semibold text-[#202020]">Date Range</legend>
        <div className={`flex h-9 min-w-0 items-center gap-1 rounded-lg border px-2 text-[#747D8C] focus-within:border-[#A61919] focus-within:ring-2 focus-within:ring-[#A61919]/10 ${(filters.dateFrom || filters.dateTo) ? 'border-[#E4C756] bg-[#FFFBEA]' : 'border-[#DEE2E7] bg-[#F5F6F8]'}`}>
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
