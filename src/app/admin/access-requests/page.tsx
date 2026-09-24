import { UserManagementWorkspace } from '@/components/admin-user-management/user-management-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { requireActiveSuperAdmin } from '@/lib/auth/admin-access';
import { getUserManagementData } from '@/lib/supabase/queries/user-management';

export default async function AdminAccessRequestsPage() {
  const context = await requireActiveSuperAdmin();
  const data = await getUserManagementData();

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="User Management" description="Manage user roles, dashboard access, and new join requests." />
      <UserManagementWorkspace
        currentUserId={context.userId}
        profiles={data.profiles}
        initialRequests={data.initialRequests}
        initialPendingRequestCount={data.pendingRequestCount}
      />
    </div>
  );
}
