import { MasterDataWorkspace } from '@/components/admin-master-data/master-data-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getMasterDataCategories } from '@/lib/supabase/queries/master-data';

export default async function AdminMasterDataPage() {
  const context = await requireActiveAdmin();
  const categories = await getMasterDataCategories();
  const canManage = context.role === 'admin' || context.role === 'super_admin';

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="Master Data" description="Manage reusable references for jobs, tasks, services, and workflows." />
      <MasterDataWorkspace initialCategories={categories} canManage={canManage} />
    </div>
  );
}
