import { AllJobsWorkspace } from '@/components/admin-all-jobs/all-jobs-workspace';
import { AddJobButton } from '@/components/admin-all-jobs/add-job-button';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { getAddJobOptions } from '@/lib/supabase/queries/add-job';
import { getAllJobs } from '@/lib/supabase/queries/all-jobs';

export default async function AdminAllJobsPage() {
  const [addJobOptions, realJobs] = await Promise.all([getAddJobOptions(), getAllJobs()]);
  const showDemoJobs = process.env.NODE_ENV !== 'production' || process.env.SHOW_DEMO_JOBS === 'true';
  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title="All Jobs"
        description="Manage all client jobs and monitor responsibilities across the team."
        action={<AddJobButton options={addJobOptions} />}
      />
      <AllJobsWorkspace realJobs={realJobs} showDemoJobs={showDemoJobs} />
    </div>
  );
}
