import 'server-only';
import type { AllJob, AllJobsFilterState } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { initialAllJobsFilters } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AdminJobPage, AdminJobRecord } from '@/types/admin-pages';

const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : '-');
export function mapAdminJob(row: AdminJobRecord): AllJob {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const days = row.estimated_end_date ? Math.round((Date.parse(row.estimated_end_date) - Date.parse(today)) / 86400000) : null;
  const completed = row.status_code === 'COMPLETED';
  return {
    id: row.id,
    clientId: row.client_id,
    picId: row.pic_id,
    isDummy: false,
    title: row.title,
    client: row.client_name,
    pic: row.pic_name,
    picInitials: row.pic_name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase(),
    internalService: row.service_name,
    stage: row.current_step_name ?? (completed ? 'Completed' : '-'),
    progress: row.progress_percentage ?? 0,
    deadline: formatDate(row.estimated_end_date),
    deadlineIso: row.estimated_end_date ?? '',
    deadlineNote: completed ? 'Completed' : days === null ? 'Not set' : days < 0 ? `Overdue ${-days} days` : days === 0 ? 'Due Today' : days === 1 ? 'Due Tomorrow' : `Due in ${days} days`,
    status: row.status_name,
    statusCode: row.status_code,
    statusColor: row.status_color,
    priority: row.priority_name,
    priorityColor: row.priority_color,
    startDate: formatDate(row.start_date),
    estimatedEndDate: formatDate(row.estimated_end_date),
    estimatedDuration: row.estimated_duration_days === null ? '-' : `${row.estimated_duration_days} days`,
    latestUpdate: row.latest_message ?? 'Belum ada remark.',
    updatedBy: row.latest_author ?? '',
    updatedAgo: formatDate(row.latest_date),
    periodDateIso: row.start_date ?? row.created_at.slice(0, 10),
  };
}
export async function getAdminJobPage(
  filters: Partial<AllJobsFilterState> = initialAllJobsFilters,
  page = 1,
  scope: { jobId?: string; clientId?: string; mine?: boolean; excludeJobId?: string } = {},
  signal?: AbortSignal
): Promise<AdminJobPage> {
  const supabase = await createSupabaseServerClient();
  const query = supabase.rpc('search_admin_jobs', {
    p_filters: { ...filters, excludeJobId: scope.excludeJobId },
    p_page: page,
    p_job_id: scope.jobId,
    p_client_id: scope.clientId,
    p_mine: scope.mine ?? false,
  });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const result = data as unknown as { rows: AdminJobRecord[]; total: number; page: number };
  return { jobs: result.rows.map(mapAdminJob), total: result.total, page: result.page, revision: String(Date.now()) };
}
