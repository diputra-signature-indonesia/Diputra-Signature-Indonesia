import { JobDetailContent } from '@/components/admin-job-detail/job-detail-content';
import { JobDetailTabs, type JobDetailTab } from '@/components/admin-job-detail/job-detail-tabs';
import { JobTabPlaceholder } from '@/components/admin-job-detail/job-tab-placeholder';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { jobDetail } from '@/data/admin-job-detail/job-detail-dummy-data';
import { Pencil } from 'lucide-react';

export default async function AdminJobDetailPage({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { jobId } = await params;
  const { tab } = await searchParams;
  const activeTab: JobDetailTab = tab === 'assignment' || tab === 'logging' ? tab : 'detail';

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title={jobDetail.title}
        description={
          <>
            <span>{jobDetail.client} · {jobDetail.reference}</span>
            <span className="ml-3 text-[#8A94A3]">{jobDetail.lastUpdated}</span>
          </>
        }
        action={
          <button type="button" className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-6 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35">
            Edit Jobs
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
        }
      />
      <JobDetailTabs jobId={jobId} activeTab={activeTab} />
      {activeTab === 'detail' ? <JobDetailContent /> : <JobTabPlaceholder tab={activeTab} />}
    </div>
  );
}
