import { MasterDataWorkspace } from '@/components/admin-master-data/master-data-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';

export default function AdminMasterDataPage() {
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="Master Data" description="Manage reusable references for jobs, tasks, services, and workflows." />
      <MasterDataWorkspace />
    </div>
  );
}
