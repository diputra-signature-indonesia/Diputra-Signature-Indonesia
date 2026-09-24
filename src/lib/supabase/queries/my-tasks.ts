import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MyTaskJob, MyTaskItem } from '@/types/admin-my-tasks';

const PAGE_SIZE = 500;
const ID_CHUNK_SIZE = 100;

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function todayInMakassar() {
  const parts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Makassar' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
    : '—';
}

function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function dueInfo(date: string | null, completed: boolean, today: string) {
  if (completed) return { label: 'Completed', tone: 'normal' as const };
  if (!date) return { label: 'No deadline', tone: 'normal' as const };
  const days = daysUntil(date, today);
  if (days < 0) return { label: `Overdue by ${-days} ${days === -1 ? 'day' : 'days'}`, tone: 'urgent' as const };
  if (days === 0) return { label: 'Due today', tone: 'urgent' as const };
  if (days === 1) return { label: 'Due tomorrow', tone: 'urgent' as const };
  return { label: `Due in ${days} days`, tone: days <= 7 ? 'warning' as const : 'normal' as const };
}

export async function getMyTasks(): Promise<MyTaskJob[]> {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const relatedJobIds = new Set<string>();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from('jobs').select('id').eq('pic_id', actor.userId).is('archived_at', null).order('id').range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to load PIC Jobs: ${error.message}`);
    for (const job of data ?? []) relatedJobIds.add(job.id);
    if (!data || data.length < PAGE_SIZE) break;
  }
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from('tasks').select('job_id').eq('assignee_id', actor.userId).is('deleted_at', null).order('id').range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to load assigned Tasks: ${error.message}`);
    for (const task of data ?? []) relatedJobIds.add(task.job_id);
    if (!data || data.length < PAGE_SIZE) break;
  }
  if (!relatedJobIds.size) return [];

  type JobRow = {
    id: string; client_id: string; pic_id: string; title: string; internal_service_id: string;
    status_id: string; created_at: string; estimated_end_date: string | null;
  };
  type TaskRow = {
    id: string; job_id: string; title: string; due_date: string | null; assignee_id: string | null;
    job_task_status_id: string; position: number; created_at: string;
  };
  type ColumnRow = { id: string; job_id: string; task_status_id: string; column_order: number };
  const jobs: JobRow[] = [];
  const tasks: TaskRow[] = [];
  const columns: ColumnRow[] = [];
  for (const ids of chunks([...relatedJobIds], ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('jobs')
      .select('id,client_id,pic_id,title,internal_service_id,status_id,created_at,estimated_end_date')
      .in('id', ids).is('archived_at', null);
    if (error) throw new Error(`Unable to load related Jobs: ${error.message}`);
    jobs.push(...(data ?? []));
  }
  if (!jobs.length) return [];

  for (const ids of chunks(jobs.map((job) => job.id), ID_CHUNK_SIZE)) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('tasks')
        .select('id,job_id,title,due_date,assignee_id,job_task_status_id,position,created_at')
        .in('job_id', ids).is('deleted_at', null).order('position').order('created_at', { ascending: false }).order('id')
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(`Unable to load Job Tasks: ${error.message}`);
      tasks.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
    }
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('job_task_statuses')
        .select('id,job_id,task_status_id,column_order').in('job_id', ids).order('job_id').order('column_order').range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(`Unable to load Task columns: ${error.message}`);
      columns.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
    }
  }

  const clients: Array<{ id: string; name: string }> = [];
  const services: Array<{ id: string; name: string }> = [];
  for (const ids of chunks([...new Set(jobs.map((job) => job.client_id))], ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('clients').select('id,name').in('id', ids);
    if (error) throw new Error(`Unable to load Client names: ${error.message}`);
    clients.push(...(data ?? []));
  }
  for (const ids of chunks([...new Set(jobs.map((job) => job.internal_service_id))], ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('internal_services').select('id,name').in('id', ids);
    if (error) throw new Error(`Unable to load Internal Service names: ${error.message}`);
    services.push(...(data ?? []));
  }
  const [jobStatuses, taskStatuses] = await Promise.all([
    supabase.from('job_statuses').select('id,name,code,color'),
    supabase.from('task_statuses').select('id,name,code,color'),
  ]);
  const labelError = [jobStatuses, taskStatuses].find((result) => result.error)?.error;
  if (labelError) throw new Error(`Unable to load My Tasks labels: ${labelError.message}`);

  const clientNames = new Map(clients.map((row) => [row.id, row.name]));
  const serviceNames = new Map(services.map((row) => [row.id, row.name]));
  const jobStatusMap = new Map((jobStatuses.data ?? []).map((row) => [row.id, row]));
  const taskStatusMap = new Map((taskStatuses.data ?? []).map((row) => [row.id, row]));
  const columnMap = new Map(columns.map((column) => [column.id, column]));
  const today = todayInMakassar();

  return jobs.map((job): MyTaskJob => {
    const isPic = job.pic_id === actor.userId;
    const jobStatus = jobStatusMap.get(job.status_id);
    const jobTasks: MyTaskItem[] = tasks.filter((task) => task.job_id === job.id && (isPic || task.assignee_id === actor.userId)).map((task) => {
      const statusId = columnMap.get(task.job_task_status_id)?.task_status_id;
      const status = taskStatusMap.get(statusId ?? '');
      const completed = status?.code === 'COMPLETED';
      return {
        id: task.id, detail: task.title, dueDate: task.due_date, deadline: formatDate(task.due_date),
        deadlineNote: dueInfo(task.due_date, completed, today).label,
        statusId: task.job_task_status_id, status: status?.name ?? 'Unknown',
        statusCode: status?.code ?? 'UNKNOWN', statusColor: status?.color ?? '#64748B',
      };
    });
    const completedCount = jobTasks.filter((task) => task.statusCode === 'COMPLETED').length;
    const openDates = jobTasks.filter((task) => task.statusCode !== 'COMPLETED' && task.dueDate).map((task) => task.dueDate!);
    const dueDate = openDates.sort()[0] ?? job.estimated_end_date;
    const due = dueInfo(dueDate, jobStatus?.code === 'COMPLETED', today);
    return {
      id: job.id, client: clientNames.get(job.client_id) ?? 'Client tidak tersedia', title: job.title,
      badgeNumber: jobTasks.length, status: jobStatus?.name ?? 'Unknown', statusCode: jobStatus?.code ?? 'UNKNOWN',
      statusColor: jobStatus?.color ?? '#64748B', internalServiceId: job.internal_service_id,
      internalService: serviceNames.get(job.internal_service_id) ?? 'Service tidak tersedia', createdAt: job.created_at,
      openCount: jobTasks.length - completedCount, completedCount, dueDate, dueLabel: due.label, dueTone: due.tone,
      statuses: columns.filter((column) => column.job_id === job.id).map((column) => {
        const status = taskStatusMap.get(column.task_status_id);
        return { id: column.id, name: status?.name ?? 'Unknown', code: status?.code ?? 'UNKNOWN', color: status?.color ?? '#64748B' };
      }),
      tasks: jobTasks,
    };
  }).sort((left, right) => (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31') || left.client.localeCompare(right.client));
}
