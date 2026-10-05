import { MyTasksWorkspace } from '@/components/admin-my-tasks/my-tasks-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { getMyTaskPage } from '@/lib/supabase/queries/my-tasks';

export default async function AdminMyTasksPage() {
  const initialPage = await getMyTaskPage();
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="My Task" description="Manage your assigned jobs and monitor every task that needs attention." />
      <MyTasksWorkspace initialPage={initialPage} />
    </div>
  );
}
