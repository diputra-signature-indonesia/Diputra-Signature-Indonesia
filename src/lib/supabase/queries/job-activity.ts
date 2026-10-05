import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.generated';

export type JobActivityCategory = 'job' | 'task' | 'remark' | 'contributor' | 'system';

export type JobActivityChange = {
  label: string;
  before: string | null;
  after: string | null;
};

export type JobActivityItem = {
  id: string;
  action: string;
  category: JobActivityCategory;
  title: string;
  description: string;
  targetLabel: string | null;
  reason: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  changes: JobActivityChange[];
};

export type JobActivityPage = {
  items: JobActivityItem[];
  nextCursor: string | null;
};

type NameMaps = {
  profiles: Map<string, string>;
  jobStatuses: Map<string, string>;
  taskStatuses: Map<string, string>;
  priorities: Map<string, string>;
  services: Map<string, string>;
  clients: Map<string, string>;
};

type RawActivity = {
  id: string;
  job_id: string;
  task_id: string | null;
  job_step_id: string | null;
  job_update_id: string | null;
  actor_id: string;
  action: string;
  old_values: Json;
  new_values: Json;
  reason: string | null;
  created_at: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: Json): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json> : {};
}

function stringValue(value: Json | undefined) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function addId(target: Set<string>, value: Json | undefined) {
  const id = stringValue(value);
  if (id && UUID.test(id)) target.add(id);
}

function titleCaseAction(action: string) {
  return action.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function actionMeta(action: string): { category: JobActivityCategory; title: string; description: string } {
  const known: Record<string, { category: JobActivityCategory; title: string; description: string }> = {
    JOB_CREATED: { category: 'job', title: 'Job created', description: 'Created this Job and its initial workflow.' },
    JOB_UPDATED: { category: 'job', title: 'Job details updated', description: 'Updated the Job information.' },
    JOB_WORKFLOW_RESTARTED: { category: 'job', title: 'Job workflow restarted', description: 'Changed the Internal Service and generated a new workflow.' },
    JOB_STATUS_CHANGED: { category: 'job', title: 'Job status changed', description: 'Changed the current Job status.' },
    JOB_STEP_COMPLETED: { category: 'job', title: 'Workflow step completed', description: 'Marked a workflow step as completed.' },
    JOB_STEP_REVERTED: { category: 'job', title: 'Workflow step reopened', description: 'Returned a completed workflow step to active.' },
    JOB_REOPENED: { category: 'job', title: 'Job reopened', description: 'Reopened a previously completed Job.' },
    JOB_ARCHIVED: { category: 'job', title: 'Job archived', description: 'Archived this Job.' },
    JOB_TRASHED: { category: 'job', title: 'Job moved to Trash', description: 'Moved this Job and its Drive folder to Trash.' },
    JOB_RESTORED: { category: 'job', title: 'Job restored', description: 'Restored this Job from Trash.' },
    TASK_BOARD_CONFIGURED: { category: 'system', title: 'Task board configured', description: 'Updated the columns used by the Task board.' },
    TASK_CREATED: { category: 'task', title: 'Task created', description: 'Added a Task to this Job.' },
    TASK_UPDATED: { category: 'task', title: 'Task updated', description: 'Updated Task information or assignment.' },
    TASK_MOVED: { category: 'task', title: 'Task status changed', description: 'Moved a Task to another status column.' },
    TASK_DELETED: { category: 'task', title: 'Task deleted', description: 'Removed a Task from this Job.' },
    JOB_UPDATE_CREATED: { category: 'remark', title: 'Remark added', description: 'Added a progress remark to this Job.' },
    JOB_UPDATE_UPDATED: { category: 'remark', title: 'Remark updated', description: 'Updated a progress remark.' },
    JOB_UPDATE_DELETED: { category: 'remark', title: 'Remark deleted', description: 'Removed a progress remark.' },
    JOB_CONTRIBUTOR_ADDED: { category: 'contributor', title: 'Contributor added', description: 'Added a contributor to this Job.' },
    JOB_CONTRIBUTOR_REMOVED: { category: 'contributor', title: 'Contributor removed', description: 'Removed a contributor from this Job.' },
  };
  return known[action] ?? { category: 'system', title: titleCaseAction(action), description: 'Recorded a Job activity.' };
}

function excerpt(value: string | null, length = 90) {
  if (!value) return null;
  return value.length > length ? `${value.slice(0, length).trimEnd()}...` : value;
}

function displayValue(action: string, key: string, value: Json | undefined, maps: NameMaps) {
  if (value === null || value === undefined || value === '') return null;
  const raw = stringValue(value);
  if (!raw) return Array.isArray(value) ? `${value.length} configured columns` : 'Updated';
  if (['pic_id', 'assignee_id', 'performed_by', 'profile_id'].includes(key)) return maps.profiles.get(raw) ?? 'Unavailable user';
  if (key === 'status_id') return (action === 'JOB_STATUS_CHANGED' || action === 'JOB_REOPENED' ? maps.jobStatuses : maps.taskStatuses).get(raw) ?? 'Unavailable status';
  if (key === 'priority_id') return maps.priorities.get(raw) ?? 'Unavailable priority';
  if (key === 'service_id' || key === 'internal_service_id') return maps.services.get(raw) ?? 'Unavailable service';
  if (key === 'client_id') return maps.clients.get(raw) ?? 'Unavailable client';
  if (key === 'is_completed') return raw === 'true' ? 'Completed' : 'Active';
  return raw;
}

function changeLabel(key: string) {
  const labels: Record<string, string> = {
    title: 'Title', client_id: 'Client', pic_id: 'PIC', service_id: 'Internal Service', internal_service_id: 'Internal Service',
    priority_id: 'Priority', status_id: 'Status', status_reason: 'Status reason', assignee_id: 'Assignee', due_date: 'Due date',
    progress_date: 'Progress date', performed_by: 'Performed by', message: 'Remark', is_completed: 'Step status', profile_id: 'Contributor',
  };
  return labels[key] ?? titleCaseAction(key);
}

function relevantKeys(action: string) {
  const keys: Record<string, string[]> = {
    JOB_CREATED: ['title', 'pic_id', 'service_id'],
    JOB_UPDATED: ['title', 'client_id', 'pic_id', 'service_id', 'priority_id'],
    JOB_WORKFLOW_RESTARTED: ['title', 'client_id', 'pic_id', 'service_id', 'priority_id'],
    JOB_STATUS_CHANGED: ['status_id', 'status_reason'],
    JOB_REOPENED: ['status_id'],
    JOB_STEP_COMPLETED: ['is_completed'],
    JOB_STEP_REVERTED: ['is_completed'],
    TASK_CREATED: ['title', 'assignee_id', 'status_id'],
    TASK_UPDATED: ['title', 'assignee_id', 'priority_id', 'due_date'],
    TASK_MOVED: ['status_id'],
    JOB_UPDATE_CREATED: ['message', 'progress_date', 'performed_by'],
    JOB_UPDATE_UPDATED: ['message', 'progress_date', 'performed_by'],
    JOB_CONTRIBUTOR_ADDED: ['profile_id'],
    JOB_CONTRIBUTOR_REMOVED: ['profile_id'],
  };
  return keys[action] ?? [];
}

function activityChanges(item: RawActivity, maps: NameMaps): JobActivityChange[] {
  const before = record(item.old_values);
  const after = record(item.new_values);
  if (before.internal_service_id !== undefined && after.service_id !== undefined) before.service_id = before.internal_service_id;

  return relevantKeys(item.action).flatMap((key) => {
    const beforeValue = displayValue(item.action, key, before[key], maps);
    const afterValue = displayValue(item.action, key, after[key], maps);
    if (beforeValue === afterValue || beforeValue === null && afterValue === null) return [];
    return [{ label: changeLabel(key), before: excerpt(beforeValue, key === 'message' ? 180 : 90), after: excerpt(afterValue, key === 'message' ? 180 : 90) }];
  });
}

export async function getJobActivityPage(jobId: string, before?: string | null, limit = 50): Promise<JobActivityPage> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const pageSize = Math.min(Math.max(limit, 1), 100);
  const activityResult = await supabase.rpc('list_job_activity', { p_job_id: jobId, p_limit: pageSize, p_before: before ?? undefined });
  if (activityResult.error) throw new Error(`Unable to load Jobs Logging: ${activityResult.error.message}`);

  const rawItems = (activityResult.data ?? []) as RawActivity[];
  const jobStatusIds = new Set<string>();
  const taskStatusIds = new Set<string>();
  const priorityIds = new Set<string>();
  const serviceIds = new Set<string>();
  const clientIds = new Set<string>();
  const taskIds = new Set<string>();
  const stepIds = new Set<string>();
  const profileIds = new Set<string>();

  for (const item of rawItems) {
    profileIds.add(item.actor_id);
    if (item.task_id) taskIds.add(item.task_id);
    if (item.job_step_id) stepIds.add(item.job_step_id);
    const values = [record(item.old_values), record(item.new_values)];
    for (const value of values) {
      for (const key of ['pic_id', 'assignee_id', 'profile_id', 'created_by', 'performed_by']) addId(profileIds, value[key]);
      for (const key of ['priority_id']) addId(priorityIds, value[key]);
      for (const key of ['service_id', 'internal_service_id']) addId(serviceIds, value[key]);
      addId(clientIds, value.client_id);
      if (item.action === 'JOB_STATUS_CHANGED' || item.action === 'JOB_REOPENED') addId(jobStatusIds, value.status_id);
      if (item.action.startsWith('TASK_')) addId(taskStatusIds, value.status_id);
    }
  }

  const [jobStatuses, taskStatusLinks, priorities, services, clients, tasks, steps, profilesResult] = await Promise.all([
    jobStatusIds.size ? supabase.from('job_statuses').select('id,name').in('id', [...jobStatusIds]) : Promise.resolve({ data: [], error: null }),
    taskStatusIds.size ? supabase.from('job_task_statuses').select('id,task_status_id').in('id', [...taskStatusIds]) : Promise.resolve({ data: [], error: null }),
    priorityIds.size ? supabase.from('priorities').select('id,name').in('id', [...priorityIds]) : Promise.resolve({ data: [], error: null }),
    serviceIds.size ? supabase.from('internal_services').select('id,name').in('id', [...serviceIds]) : Promise.resolve({ data: [], error: null }),
    clientIds.size ? supabase.from('clients').select('id,name').in('id', [...clientIds]) : Promise.resolve({ data: [], error: null }),
    taskIds.size ? supabase.from('tasks').select('id,title').in('id', [...taskIds]) : Promise.resolve({ data: [], error: null }),
    stepIds.size ? supabase.from('job_steps').select('id,name').in('id', [...stepIds]) : Promise.resolve({ data: [], error: null }),
    profileIds.size ? supabase.rpc('list_assignable_profiles').in('id', [...profileIds]) : Promise.resolve({ data: [], error: null }),
  ]);
  const activeProfiles = profilesResult.data ?? [];
  const queryError = [jobStatuses, taskStatusLinks, priorities, services, clients, tasks, steps, profilesResult].find((result) => result.error)?.error;
  if (queryError) throw new Error(`Unable to enrich Jobs Logging: ${queryError.message}`);

  const masterTaskStatusIds = [...new Set((taskStatusLinks.data ?? []).map((status) => status.task_status_id))];
  const taskStatusMaster = masterTaskStatusIds.length
    ? await supabase.from('task_statuses').select('id,name').in('id', masterTaskStatusIds)
    : { data: [], error: null };
  if (taskStatusMaster.error) throw new Error(`Unable to load Task status names: ${taskStatusMaster.error.message}`);

  const profileNames = new Map(activeProfiles.map((profile) => [profile.id, profile.display_name || 'Unavailable user']));
  const profileAvatars = new Map(activeProfiles.map((profile) => [profile.id, profile.avatar_url ?? null]));
  const masterTaskStatuses = new Map((taskStatusMaster.data ?? []).map((status) => [status.id, status.name]));
  const taskStatusNames = new Map((taskStatusLinks.data ?? []).map((status) => [status.id, masterTaskStatuses.get(status.task_status_id) ?? 'Unavailable status']));
  const maps: NameMaps = {
    profiles: profileNames,
    jobStatuses: new Map((jobStatuses.data ?? []).map((status) => [status.id, status.name])),
    taskStatuses: taskStatusNames,
    priorities: new Map((priorities.data ?? []).map((priority) => [priority.id, priority.name])),
    services: new Map((services.data ?? []).map((service) => [service.id, service.name])),
    clients: new Map((clients.data ?? []).map((client) => [client.id, client.name])),
  };
  const taskNames = new Map((tasks.data ?? []).map((task) => [task.id, task.title]));
  const stepNames = new Map((steps.data ?? []).map((step) => [step.id, step.name]));

  const items = rawItems.map((item): JobActivityItem => {
    const meta = actionMeta(item.action);
    const oldValues = record(item.old_values);
    const newValues = record(item.new_values);
    const profileId = stringValue(newValues.profile_id) ?? stringValue(oldValues.profile_id);
    const message = stringValue(newValues.message) ?? stringValue(oldValues.message);
    const taskTitle = item.task_id ? taskNames.get(item.task_id) : null;
    const loggedTitle = stringValue(newValues.title) ?? stringValue(oldValues.title);
    const targetLabel = item.action.startsWith('TASK_')
      ? taskTitle ?? loggedTitle ?? 'Unavailable Task'
      : item.action.startsWith('JOB_STEP_')
        ? item.job_step_id ? stepNames.get(item.job_step_id) ?? 'Unavailable workflow step' : null
        : item.action.startsWith('JOB_UPDATE_')
          ? excerpt(message, 120)
          : item.action.startsWith('JOB_CONTRIBUTOR_') && profileId
            ? profileNames.get(profileId) ?? 'Unavailable user'
            : null;

    return {
      id: item.id,
      action: item.action,
      category: meta.category,
      title: meta.title,
      description: meta.description,
      targetLabel,
      reason: item.reason,
      createdAt: item.created_at,
      actor: {
        id: item.actor_id,
        name: profileNames.get(item.actor_id) ?? 'Unavailable user',
        avatarUrl: profileAvatars.get(item.actor_id) ?? null,
      },
      changes: activityChanges(item, maps),
    };
  });

  return {
    items,
    nextCursor: rawItems.length === pageSize ? rawItems.at(-1)?.created_at ?? null : null,
  };
}
