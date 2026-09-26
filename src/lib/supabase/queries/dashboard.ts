import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DashboardData, DashboardFilterOption, DashboardTaskRecord } from '@/types/admin-dashboard';

const PAGE_SIZE = 500;
const ID_CHUNK_SIZE = 100;

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function uniqueOptions(options: DashboardFilterOption[]) {
  return [...new Map(options.map((option) => [option.value, option])).values()]
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function getDashboardData(): Promise<DashboardData> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();

  type TaskRow = {
    id: string;
    job_id: string;
    title: string;
    due_date: string | null;
    assignee_id: string | null;
    priority_id: string | null;
    job_task_status_id: string;
  };
  type JobRow = {
    id: string;
    client_id: string;
    internal_service_id: string;
    progress_percentage: number | null;
  };

  const taskRows: TaskRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from('tasks')
      .select('id,job_id,title,due_date,assignee_id,priority_id,job_task_status_id')
      .is('deleted_at', null).order('created_at', { ascending: false }).order('id')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to load Dashboard Tasks: ${error.message}`);
    taskRows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  if (!taskRows.length) {
    return { tasks: [], filterOptions: { pics: [], clients: [], statuses: [], internalServices: [] } };
  }

  const jobRows: JobRow[] = [];
  for (const ids of chunks([...new Set(taskRows.map((task) => task.job_id))], ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('job_overview')
      .select('id,client_id,internal_service_id,progress_percentage')
      .in('id', ids).is('archived_at', null);
    if (error) throw new Error(`Unable to load Dashboard Jobs: ${error.message}`);
    jobRows.push(...(data ?? []).filter((row): row is JobRow => Boolean(row.id && row.client_id && row.internal_service_id)));
  }

  const jobMap = new Map(jobRows.map((job) => [job.id, job]));
  const visibleTasks = taskRows.filter((task) => jobMap.has(task.job_id));
  if (!visibleTasks.length) {
    return { tasks: [], filterOptions: { pics: [], clients: [], statuses: [], internalServices: [] } };
  }

  const clientIds = [...new Set(jobRows.map((job) => job.client_id))];
  const serviceIds = [...new Set(jobRows.map((job) => job.internal_service_id))];
  const columnIds = [...new Set(visibleTasks.map((task) => task.job_task_status_id))];
  const priorityIds = [...new Set(visibleTasks.map((task) => task.priority_id).filter((id): id is string => Boolean(id)))];
  const clients: Array<{ id: string; name: string }> = [];
  const services: Array<{ id: string; name: string }> = [];
  const columns: Array<{ id: string; task_status_id: string }> = [];
  const priorities: Array<{ id: string; name: string; color: string }> = [];

  for (const ids of chunks(clientIds, ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('clients').select('id,name').in('id', ids);
    if (error) throw new Error(`Unable to load Dashboard Clients: ${error.message}`);
    clients.push(...(data ?? []));
  }
  for (const ids of chunks(serviceIds, ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('internal_services').select('id,name').in('id', ids);
    if (error) throw new Error(`Unable to load Dashboard Internal Services: ${error.message}`);
    services.push(...(data ?? []));
  }
  for (const ids of chunks(columnIds, ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('job_task_statuses').select('id,task_status_id').in('id', ids);
    if (error) throw new Error(`Unable to load Dashboard Task columns: ${error.message}`);
    columns.push(...(data ?? []));
  }
  for (const ids of chunks(priorityIds, ID_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('priorities').select('id,name,color').in('id', ids);
    if (error) throw new Error(`Unable to load Dashboard Priorities: ${error.message}`);
    priorities.push(...(data ?? []));
  }

  const [taskStatusesResult, profilesResult] = await Promise.all([
    supabase.from('task_statuses').select('id,name,code,color').order('sort_order').order('name'),
    supabase.rpc('list_assignable_profiles'),
  ]);
  const labelError = taskStatusesResult.error ?? profilesResult.error;
  if (labelError) throw new Error(`Unable to load Dashboard labels: ${labelError.message}`);

  const clientMap = new Map(clients.map((row) => [row.id, row.name]));
  const serviceMap = new Map(services.map((row) => [row.id, row.name]));
  const columnMap = new Map(columns.map((row) => [row.id, row.task_status_id]));
  const priorityMap = new Map(priorities.map((row) => [row.id, row]));
  const statusMap = new Map((taskStatusesResult.data ?? []).map((row) => [row.id, row]));
  const profileMap = new Map((profilesResult.data ?? []).map((row) => [row.id, row.display_name]));

  const tasks: DashboardTaskRecord[] = visibleTasks.map((task) => {
    const job = jobMap.get(task.job_id)!;
    const statusId = columnMap.get(task.job_task_status_id) ?? '';
    const status = statusMap.get(statusId);
    const priority = priorityMap.get(task.priority_id ?? '');
    return {
      id: task.id,
      jobId: task.job_id,
      title: task.title,
      dueDate: task.due_date,
      assigneeId: task.assignee_id,
      assigneeName: task.assignee_id ? (profileMap.get(task.assignee_id) ?? 'PIC tidak tersedia') : 'Belum ditugaskan',
      clientId: job.client_id,
      clientName: clientMap.get(job.client_id) ?? 'Client tidak tersedia',
      internalServiceId: job.internal_service_id,
      internalServiceName: serviceMap.get(job.internal_service_id) ?? 'Service tidak tersedia',
      priorityName: priority?.name ?? 'Tanpa prioritas',
      priorityColor: priority?.color ?? '#64748B',
      statusId,
      statusName: status?.name ?? 'Status tidak tersedia',
      statusCode: status?.code ?? 'UNKNOWN',
      statusColor: status?.color ?? '#64748B',
      progress: Math.max(0, Math.min(100, job.progress_percentage ?? 0)),
    };
  });

  return {
    tasks,
    filterOptions: {
      pics: uniqueOptions(tasks.map((task) => ({ value: task.assigneeId ?? 'UNASSIGNED', label: task.assigneeName }))),
      clients: uniqueOptions(tasks.map((task) => ({ value: task.clientId, label: task.clientName }))),
      statuses: uniqueOptions(tasks.map((task) => ({ value: task.statusId, label: task.statusName }))),
      internalServices: uniqueOptions(tasks.map((task) => ({ value: task.internalServiceId, label: task.internalServiceName }))),
    },
  };
}
