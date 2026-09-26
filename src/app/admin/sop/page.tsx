import { SopWorkspace } from '@/components/admin-sop/sop-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { getSopWorkspaceData } from '@/lib/supabase/queries/sop';

export default async function AdminSopPage() {
  const data = await getSopWorkspaceData();
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="SOP" description="Manage internal service procedures, flows, and requirements." />
      <SopWorkspace data={data} />
    </div>
  );
}
