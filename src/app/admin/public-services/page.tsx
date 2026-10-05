import { PublicServicesWorkspace } from '@/components/admin-public-services/public-services-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getPublicServiceManagementData, getStaffPublicServiceManagementData } from '@/lib/supabase/queries/public-service-management';

export default async function AdminPublicServicesPage() {
  const context = await requireActiveAdmin();
  const categories = context.role === 'staff' ? await getStaffPublicServiceManagementData() : await getPublicServiceManagementData();

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="Client Services" description="Manage Services, Sub-services, and optional details displayed on the public website." />
      <PublicServicesWorkspace initialPage={categories} canManageServices={context.role === 'admin' || context.role === 'super_admin'} />
    </div>
  );
}
