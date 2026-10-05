'use client';
import { useState } from 'react';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import type { DashboardData } from '@/types/admin-dashboard';
import { DashboardAttentionTable } from './dashboard-attention-table';
import { DashboardCategoryCard } from './dashboard-category-card';
import { DashboardFilters, initialDashboardFilters } from './dashboard-filters';
import { DashboardPicLoadCard } from './dashboard-pic-load-card';
import { DashboardStatCards } from './dashboard-stat-cards';
export function DashboardWorkspace({ data }: { data: DashboardData }) {
  const [filters, setFilters] = useState(initialDashboardFilters);
  const params = new URLSearchParams({ ...filters, revision: data.revision });
  const result = useAdminPage<DashboardData>(`/api/admin/dashboard?${params}`, data);
  const current = result.data ?? data;
  return (
    <>
      <DashboardFilters options={data.filterOptions} onApply={setFilters} />
      <div className="space-y-5 px-4 py-5 sm:px-5 lg:px-6" aria-busy={result.loading}>
        {result.loading ? (
          <p role="status" className="text-xs text-gray-500">
            Loading dashboard...
          </p>
        ) : null}
        {result.error ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {result.error}
          </p>
        ) : null}
        <DashboardStatCards metrics={current.metrics} />
        <section className="grid gap-5 xl:grid-cols-2">
          <DashboardPicLoadCard taskLoads={current.taskLoads} />
          <DashboardCategoryCard internalServices={current.internalServices} />
        </section>
        <DashboardAttentionTable tasks={current.attentionTasks} />
      </div>
    </>
  );
}
