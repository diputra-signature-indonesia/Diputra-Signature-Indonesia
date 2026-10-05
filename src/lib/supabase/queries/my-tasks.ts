import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { adminDeadline } from '@/lib/admin-deadline';
import type { AdminJobRecord } from '@/types/admin-pages';
import type { MyTaskJob, MyTaskItem, MyTasksFilterState, MyTaskPage } from '@/types/admin-my-tasks';

type JobRow = AdminJobRecord & { task_count: number; completed_count: number; internal_service_id: string; task_due_date: string | null };
type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  version: number;
  can_change_status: boolean;
  assignee_name: string;
  priority_name: string | null;
  job_task_status_id: string;
  status_name: string;
  status_code: string;
  status_color: string;
};
type Result = {
  jobs: JobRow[];
  total: number;
  page: number;
  selectedId: string | null;
  tasks: TaskRow[];
  statuses: MyTaskJob['statuses'];
  taskTotal: number;
  taskPage: number;
  jobStatuses: { value: string; label: string }[];
};
export async function getMyTaskPage(
  filters: Partial<MyTasksFilterState> & { jobQuery?: string } = { status: 'ACTIVE' },
  page = 1,
  selectedId?: string,
  taskPage = 1,
  taskStatus?: string,
  signal?: AbortSignal
): Promise<MyTaskPage> {
  const supabase = await createSupabaseServerClient();
  const query = supabase.rpc('search_my_tasks', { p_filters: filters, p_page: page, p_selected_job: selectedId, p_task_page: taskPage, p_task_status: taskStatus });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const result = data as unknown as Result;
  const jobs = result.jobs.map((row): MyTaskJob => {
    const due = adminDeadline(row.task_due_date, row.status_code === 'COMPLETED');
    const date = row.task_due_date;
    return {
      id: row.id,
      client: row.client_name,
      title: row.title,
      badgeNumber: row.task_count,
      status: row.status_name,
      statusCode: row.status_code,
      statusColor: row.status_color,
      internalServiceId: row.internal_service_id,
      internalService: row.service_name,
      createdAt: row.created_at,
      openCount: row.task_count - row.completed_count,
      completedCount: row.completed_count,
      dueDate: date,
      dueLabel: due.note,
      dueTone: due.tone,
      statuses: [],
      tasks: [],
    };
  });
  const selected = jobs.find((job) => job.id === result.selectedId);
  const tasks = result.tasks.map(
    (task): MyTaskItem => ({
      id: task.id,
      detail: task.title,
      description: task.description,
      assigneeName: task.assignee_name,
      priorityName: task.priority_name,
      version: task.version,
      canChangeStatus: task.can_change_status,
      dueDate: task.due_date,
      deadline: task.due_date ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(task.due_date)) : 'No deadline',
      deadlineNote: adminDeadline(task.due_date, task.status_code === 'COMPLETED').note,
      statusId: task.job_task_status_id,
      status: task.status_name,
      statusCode: task.status_code,
      statusColor: task.status_color,
    })
  );
  return {
    jobs,
    total: result.total,
    page: result.page,
    selected: selected ? { ...selected, tasks, statuses: result.statuses } : null,
    taskTotal: result.taskTotal,
    taskPage: result.taskPage,
    jobStatuses: result.jobStatuses,
    revision: String(Date.now()),
  };
}
