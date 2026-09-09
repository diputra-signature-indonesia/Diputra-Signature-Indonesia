import { MyTasksFilters } from '@/components/admin-my-tasks/my-tasks-filters';
import { MyTasksWorkspace } from '@/components/admin-my-tasks/my-tasks-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { myTaskJobs } from '@/data/admin-my-tasks/my-tasks-dummy-data';

export default function AdminMyTasksPage() {
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="My Task" description="Manage your assigned jobs and monitor every task that needs attention." />
      <MyTasksFilters />
      <MyTasksWorkspace jobs={myTaskJobs} />
    </div>
  );
}
