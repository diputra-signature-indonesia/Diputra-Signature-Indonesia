import { JobDetailContent } from '@/components/admin-job-detail/job-detail-content';
import { EditJobButton } from '@/components/admin-job-detail/edit-job-button';
import { LiveJobDetailContent } from '@/components/admin-job-detail/live-job-detail-content';
import { LiveTaskAssignmentContent } from '@/components/admin-job-detail/live-task-assignment-content';
import { JobDetailTabs, type JobDetailTab } from '@/components/admin-job-detail/job-detail-tabs';
import { JobTabPlaceholder } from '@/components/admin-job-detail/job-tab-placeholder';
import { TaskAssignmentContent } from '@/components/admin-job-detail/task-assignment-content';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { allJobsDummy } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { jobDetail } from '@/data/admin-job-detail/job-detail-dummy-data';
import { getAddJobOptions } from '@/lib/supabase/queries/add-job';
import { getJobDetail } from '@/lib/supabase/queries/job-detail';
import { getTaskAssignment } from '@/lib/supabase/queries/task-assignment';
import { LoaderCircle, Pencil } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function TaskAssignmentSection({ jobId, taskId }: { jobId: string; taskId?: string }) {
  const taskAssignment = await getTaskAssignment(jobId);
  if (!taskAssignment) notFound();
  return <LiveTaskAssignmentContent key={taskId ?? 'board'} data={taskAssignment} initialTaskId={taskId} />;
}

export default async function AdminJobDetailPage({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ tab?: string; task?: string }> }) {
  const { jobId } = await params;
  const { tab, task } = await searchParams;
  const activeTab: JobDetailTab = tab === 'assignment' || tab === 'logging' ? tab : 'detail';

  if (UUID_PATTERN.test(jobId)) {
    const detail = await getJobDetail(jobId);
    if (!detail) notFound();
    const editOptions = detail.canManage && detail.statusCode !== 'COMPLETED' ? await getAddJobOptions() : null;
    const lastUpdated = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(detail.job.updated_at));

    return (
      <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
        <AdminPageHeader title={detail.job.title} description={<><span>{detail.summary.client} · {detail.summary.internalService}</span><span className="ml-3 text-[#8A94A3]">Last updated {lastUpdated}</span></>} action={editOptions ? <EditJobButton detail={detail} options={editOptions} /> : null} />
        <JobDetailTabs jobId={jobId} activeTab={activeTab} />
        {activeTab === 'detail' ? <LiveJobDetailContent detail={detail} /> : null}
        {activeTab === 'assignment' ? <Suspense fallback={<div className="flex min-h-[calc(100vh-176px)] items-center justify-center bg-[#F8F9FA]/75" role="status" aria-label="Loading Task Assignment"><LoaderCircle className="size-7 animate-spin text-[#8C1010]" /></div>}><TaskAssignmentSection jobId={jobId} taskId={task && UUID_PATTERN.test(task) ? task : undefined} /></Suspense> : null}
        {activeTab === 'logging' ? <JobTabPlaceholder tab="logging" /> : null}
      </div>
    );
  }
  const dummyJob = allJobsDummy.find((item) => item.id === jobId);
  if (!dummyJob || process.env.NODE_ENV === 'production' && process.env.SHOW_DEMO_JOBS !== 'true') notFound();

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title={dummyJob.title}
        description={
          <>
            <span>{dummyJob.client} · Contoh tampilan</span>
            <span className="ml-3 text-[#8A94A3]">{jobDetail.lastUpdated}</span>
          </>
        }
        action={
          <button type="button" disabled title="Data contoh tidak dapat diedit" className="inline-flex h-8 cursor-not-allowed items-center gap-2 rounded bg-[#9F1010] px-6 text-[11px] font-semibold text-white opacity-50">
            Edit Jobs
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
        }
      />
      <JobDetailTabs jobId={jobId} activeTab={activeTab} />
      <p className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:mx-5 lg:mx-6">Halaman ini menggunakan data contoh; isi detail belum disambungkan dengan baris dummy yang dipilih.</p>
      {activeTab === 'detail' ? <JobDetailContent /> : null}
      {activeTab === 'assignment' ? <TaskAssignmentContent /> : null}
      {activeTab === 'logging' ? <JobTabPlaceholder tab="logging" /> : null}
    </div>
  );
}
