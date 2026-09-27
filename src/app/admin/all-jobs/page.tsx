import { AllJobsWorkspace } from '@/components/admin-all-jobs/all-jobs-workspace';
import { AddJobButton } from '@/components/admin-all-jobs/add-job-button';
import { TrashJobsButton } from '@/components/admin-all-jobs/trash-jobs-button';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { getAddJobOptions } from '@/lib/supabase/queries/add-job';
import { getAllJobs } from '@/lib/supabase/queries/all-jobs';
import { getTrashedJobs } from '@/lib/supabase/queries/job-trash';

export default async function AdminAllJobsPage() {
  const [addJobOptions, realJobs, trashedJobs] = await Promise.all([getAddJobOptions(), getAllJobs(), getTrashedJobs()]);
  const isAdmin = addJobOptions.actor.role === 'admin' || addJobOptions.actor.role === 'super_admin';
  const showDemoJobs = process.env.NODE_ENV !== 'production' || process.env.SHOW_DEMO_JOBS === 'true';
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title="All Jobs"
        description="Manage all client jobs and monitor responsibilities across the team."
        action={
          <div className="flex items-center gap-2">
            {isAdmin ? <TrashJobsButton jobs={trashedJobs} /> : null}
            <AddJobButton options={addJobOptions} />
          </div>
        }
      />
      <AllJobsWorkspace realJobs={realJobs} showDemoJobs={showDemoJobs} options={addJobOptions} />
    </div>
  );
}
