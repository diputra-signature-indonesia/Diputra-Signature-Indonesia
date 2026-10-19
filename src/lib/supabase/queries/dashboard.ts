import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { makassarToday } from '@/lib/admin-deadline';
import type { DashboardData, DashboardMetric, PicTaskLoad, JobInternalServiceSummary, DashboardFilterOption } from '@/types/admin-dashboard';
type AttentionRow = {
  id: string;
  title: string;
  due_date: string | null;
  client_name: string;
  pic_name: string;
  service_name: string;
  priority_name: string | null;
  priority_color: string | null;
  status_name: string;
  status_color: string;
  progress: number;
};
type Result = { counts: Record<string, number>; taskLoads: PicTaskLoad[]; internalServices: Omit<JobInternalServiceSummary, 'color'>[]; attention: AttentionRow[]; statuses: DashboardFilterOption[] };
const colors = ['#7B0000', '#F2C900', '#64748B', '#2563EB', '#F97316', '#14A45A', '#9333EA', '#0891B2', '#DB2777', '#A16207'];
export async function getDashboardData(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const query = supabase.rpc('search_admin_dashboard', { p_filters: filters });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const r = data as unknown as Result;
  const definitions: Array<[string, string, DashboardMetric['icon'], DashboardMetric['tone']]> = [
    ['active', 'Total Job Aktif', 'active', 'brand'],
    ['not_started', 'Belum Dimulai', 'not-started', 'neutral'],
    ['in_progress', 'Dalam Proses', 'in-progress', 'yellow'],
    ['delayed', 'Tertunda', 'delayed', 'red'],
    ['completed', 'Selesai', 'completed', 'green'],
    ['near_deadline', 'Mendekati Deadline', 'near-deadline', 'yellow'],
    ['due_today', 'Deadline Hari Ini', 'due-today', 'brand'],
    ['overdue', 'Melewati Deadline', 'overdue', 'red'],
  ];
  const today = Date.parse(makassarToday());
  return {
    metrics: definitions.map(([key, label, icon, tone]) => ({ label, icon, tone, value: r.counts[key] ?? 0 })),
    taskLoads: r.taskLoads,
    internalServices: r.internalServices.map((service, index) => ({ ...service, color: colors[index % colors.length] })),
    attentionJobs: r.attention.map((job) => {
      const days = job.due_date ? Math.round((Date.parse(job.due_date) - today) / 86400000) : null;
      return {
        id: job.id,
        client: job.client_name,
        title: job.title,
        pic: job.pic_name,
        internalService: job.service_name,
        priority: job.priority_name ?? 'Tanpa prioritas',
        priorityColor: job.priority_color ?? '#64748B',
        status: job.status_name,
        statusColor: job.status_color,
        progress: job.progress,
        deadline: days === null ? 'Tanpa deadline' : days < 0 ? `Lewat ${-days} hari` : days === 0 ? 'Hari ini' : days === 1 ? 'Besok' : `H-${days}`,
        deadlineTone: days !== null && days <= 0 ? 'urgent' : days !== null && days <= 7 ? 'warning' : 'normal',
      };
    }),
    filterOptions: { pics: [], clients: [], internalServices: [], statuses: r.statuses },
    revision: String(Date.now()),
  };
}
