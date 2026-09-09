import { DashboardAttentionTable } from '@/components/admin-dashboard/dashboard-attention-table';
import { DashboardCategoryCard } from '@/components/admin-dashboard/dashboard-category-card';
import { DashboardFilters } from '@/components/admin-dashboard/dashboard-filters';
import { DashboardPicLoadCard } from '@/components/admin-dashboard/dashboard-pic-load-card';
import { DashboardStatCards } from '@/components/admin-dashboard/dashboard-stat-cards';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { attentionTasks, categorySummary, dashboardMetrics, picTaskLoads } from '@/data/admin-dashboard/dashboard-dummy-data';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="Dashboard" description="Manage all client jobs and monitor responsibilities across the team." />
      <DashboardFilters />

      <div className="space-y-5 px-4 py-5 sm:px-5 lg:px-6">
        <DashboardStatCards metrics={dashboardMetrics} />

        <section className="grid gap-5 xl:grid-cols-2">
          <DashboardPicLoadCard taskLoads={picTaskLoads} />
          <DashboardCategoryCard categories={categorySummary} />
        </section>

        <DashboardAttentionTable tasks={attentionTasks} />
      </div>
    </div>
  );
}
