import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getTaskAssignment(jobId: string) {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const [job, columns, tasks, statuses, priorities, profiles] = await Promise.all([
    supabase.from('jobs').select('id,pic_id,archived_at,status_id').eq('id', jobId).maybeSingle(),
    supabase.from('job_task_statuses').select('id,task_status_id,column_order').eq('job_id', jobId).order('column_order'),
    supabase.from('tasks').select('id,job_task_status_id,title,description,assignee_id,priority_id,due_date,position,version,created_at').eq('job_id', jobId).is('deleted_at', null).order('position').order('created_at', { ascending: false }),
    supabase.from('task_statuses').select('id,code,name,color,is_active').order('sort_order'),
    supabase.from('priorities').select('id,name,is_active').order('sort_order'),
    supabase.rpc('list_assignable_profiles'),
  ]);
  const error = [job, columns, tasks, statuses, priorities, profiles].find((result) => result.error)?.error;
  if (error) throw new Error(`Unable to load Task Assignment: ${error.message}`);
  if (!job.data) return null;

  const { data: jobStatus, error: statusError } = await supabase.from('job_statuses').select('code').eq('id', job.data.status_id).single();
  if (statusError) throw new Error(`Unable to load Job status: ${statusError.message}`);
  const statusMap = new Map((statuses.data ?? []).map((status) => [status.id, status]));
  const priorityMap = new Map((priorities.data ?? []).map((priority) => [priority.id, priority]));
  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const canManage = actor.role === 'admin' || actor.role === 'super_admin' || actor.userId === job.data.pic_id;
  const readOnly = Boolean(job.data.archived_at) || jobStatus?.code === 'COMPLETED';

  return {
    jobId,
    actorId: actor.userId,
    canManage,
    canCreate: !readOnly,
    readOnly,
    columns: (columns.data ?? []).map((column) => ({
      ...column,
      name: statusMap.get(column.task_status_id)?.name ?? 'Status tidak tersedia',
      code: statusMap.get(column.task_status_id)?.code ?? '',
      color: statusMap.get(column.task_status_id)?.color ?? '#8C1010',
    })),
    tasks: (tasks.data ?? []).map((task) => ({
      ...task,
      assigneeName: task.assignee_id ? profileMap.get(task.assignee_id)?.display_name ?? 'Pengguna tidak aktif' : 'Unassigned',
      priorityName: task.priority_id ? priorityMap.get(task.priority_id)?.name ?? 'Prioritas tidak aktif' : null,
      canEdit: !readOnly && (canManage || task.assignee_id === actor.userId),
    })),
    availableStatuses: (statuses.data ?? []).filter((status) => status.is_active),
    priorities: (priorities.data ?? []).filter((priority) => priority.is_active),
    profiles: profiles.data ?? [],
  };
}

export type LiveTaskAssignment = NonNullable<Awaited<ReturnType<typeof getTaskAssignment>>>;
