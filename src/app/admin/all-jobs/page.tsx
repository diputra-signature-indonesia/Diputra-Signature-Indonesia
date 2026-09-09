import { AllJobsWorkspace } from '@/components/admin-all-jobs/all-jobs-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { Plus } from 'lucide-react';

export default function AdminAllJobsPage() {
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title="All Jobs"
        description="Manage all client jobs and monitor responsibilities across the team."
        action={
          <button type="button" className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-6 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35">
            Add Jobs
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        }
      />
      <AllJobsWorkspace />
    </div>
  );
}
