import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DashboardData, DashboardMetric, PicTaskLoad, TaskInternalServiceSummary, DashboardFilterOption } from '@/types/admin-dashboard';
type AttentionRow = {
  id: string;
  job_id: string;
  title: string;
  due_date: string | null;
  client_name: string;
  assignee_name: string;
  service_name: string;
  priority_name: string | null;
  priority_color: string | null;
  status_name: string;
  status_color: string;
  progress: number;
};
type Result = { counts: Record<string, number>; taskLoads: PicTaskLoad[]; internalServices: Omit<TaskInternalServiceSummary, 'color'>[]; attention: AttentionRow[]; statuses: DashboardFilterOption[] };
const colors = ['#7B0000', '#F2C900', '#64748B', '#2563EB', '#F97316', '#14A45A', '#9333EA', '#0891B2', '#DB2777', '#A16207'];
export async function getDashboardData(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const query = supabase.rpc('search_admin_dashboard', { p_filters: filters });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const r = data as unknown as Result;
  const definitions: Array<[string, string, DashboardMetric['icon'], DashboardMetric['tone']]> = [
    ['active', 'Total Task Aktif', 'active', 'brand'],
    ['not_started', 'Belum Dimulai', 'not-started', 'neutral'],
    ['in_progress', 'Dalam Proses', 'in-progress', 'yellow'],
    ['delayed', 'Tertunda', 'delayed', 'red'],
    ['completed', 'Selesai', 'completed', 'green'],
    ['near_deadline', 'Mendekati Deadline', 'near-deadline', 'yellow'],
    ['due_today', 'Deadline Hari Ini', 'due-today', 'brand'],
    ['overdue', 'Melewati Deadline', 'overdue', 'red'],
  ];
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (name: string) => parts.find((p) => p.type === name)?.value;
  const today = Date.parse(`${get('year')}-${get('month')}-${get('day')}`);
  return {
    metrics: definitions.map(([key, label, icon, tone]) => ({ label, icon, tone, value: r.counts[key] ?? 0 })),
    taskLoads: r.taskLoads,
    internalServices: r.internalServices.map((service, index) => ({ ...service, color: colors[index % colors.length] })),
    attentionTasks: r.attention.map((task) => {
      const days = task.due_date ? Math.round((Date.parse(task.due_date) - today) / 86400000) : null;
      return {
        id: task.id,
        jobId: task.job_id,
        client: task.client_name,
        task: task.title,
        pic: task.assignee_name,
        internalService: task.service_name,
        priority: task.priority_name ?? 'Tanpa prioritas',
        priorityColor: task.priority_color ?? '#64748B',
        status: task.status_name,
        statusColor: task.status_color,
        progress: task.progress,
        deadline: days === null ? 'Tanpa deadline' : days < 0 ? `Lewat ${-days} hari` : days === 0 ? 'Hari ini' : days === 1 ? 'Besok' : `H-${days}`,
        deadlineTone: days !== null && days <= 0 ? 'urgent' : days !== null && days <= 7 ? 'warning' : 'normal',
      };
    }),
    filterOptions: { pics: [], clients: [], internalServices: [], statuses: r.statuses },
    revision: String(Date.now()),
  };
}
