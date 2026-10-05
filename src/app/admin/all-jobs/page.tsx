import { AllJobsWorkspace } from '@/components/admin-all-jobs/all-jobs-workspace';
import { AddJobButton } from '@/components/admin-all-jobs/add-job-button';
import { JobTrashButton } from '@/components/admin-all-jobs/job-trash-button';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { getAddJobOptions } from '@/lib/supabase/queries/add-job';
import { getAdminJobPage } from '@/lib/supabase/queries/all-jobs';

export default async function AdminAllJobsPage() {
  const [addJobOptions, initialPage] = await Promise.all([getAddJobOptions(), getAdminJobPage()]);
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title="All Jobs"
        description="Manage all client jobs and monitor responsibilities across the team."
        action={
          <div className="flex items-center gap-2">
            {addJobOptions.actor.role === 'admin' || addJobOptions.actor.role === 'super_admin' ? <JobTrashButton /> : null}
            <AddJobButton options={addJobOptions} />
          </div>
        }
      />
      <AllJobsWorkspace initialPage={initialPage} options={addJobOptions} />
    </div>
  );
}
