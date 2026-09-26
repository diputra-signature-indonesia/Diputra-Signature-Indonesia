import { DashboardWorkspace } from '@/components/admin-dashboard/dashboard-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { getDashboardData } from '@/lib/supabase/queries/dashboard';

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="Dashboard" description="Manage all client jobs and monitor responsibilities across the team." />
      <DashboardWorkspace data={data} />
    </div>
  );
}
