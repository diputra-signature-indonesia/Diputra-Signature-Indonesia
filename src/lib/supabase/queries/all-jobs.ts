import 'server-only';

import type { AllJob } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PAGE_SIZE = 500;

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function todayInMakassar() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Makassar',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function deadlineNote(date: string | null, completed: boolean, today: string) {
  if (completed) return 'Completed';
  if (!date) return 'Not set';
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return `Overdue ${-days} ${-days === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Due Today';
  if (days === 1) return 'Due Tomorrow';
  return `Due in ${days} days`;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('') || '—';
}

export async function getAllJobs(): Promise<AllJob[]> {
  await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  // Supabase caps one response; page through it so filters and pagination see all Jobs.
  const rows: Array<{
    id: string | null; title: string | null; client_id: string | null; pic_id: string | null;
    internal_service_id: string | null; priority_id: string | null; status_id: string | null;
    start_date: string | null; estimated_end_date: string | null; estimated_duration_days: number | null;
    current_step_name: string | null; progress_percentage: number | null;
  }> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from('job_overview')
      .select('id,title,client_id,pic_id,internal_service_id,priority_id,status_id,start_date,estimated_end_date,estimated_duration_days,current_step_name,progress_percentage')
      .is('archived_at', null).order('created_at', { ascending: false }).order('id')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to load Jobs: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  if (!rows.length) return [];

  const [clients, services, priorities, statuses, profiles, updates] = await Promise.all([
    supabase.from('clients').select('id,name'),
    supabase.from('internal_services').select('id,name'),
    supabase.from('priorities').select('id,name,color'),
    supabase.from('job_statuses').select('id,name,code,color'),
    supabase.rpc('list_assignable_profiles'),
    supabase.from('job_updates').select('job_id,message,progress_date,created_at,created_by')
      .order('progress_date', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  const error = [clients, services, priorities, statuses, profiles, updates].find((result) => result.error)?.error;
  if (error) throw new Error(`Unable to load Job labels: ${error.message}`);

  const clientNames = new Map((clients.data ?? []).map((item) => [item.id, item.name]));
  const serviceNames = new Map((services.data ?? []).map((item) => [item.id, item.name]));
  const priorityNames = new Map((priorities.data ?? []).map((item) => [item.id, item.name]));
  const priorityColors = new Map((priorities.data ?? []).map((item) => [item.id, item.color]));
  const statusNames = new Map((statuses.data ?? []).map((item) => [item.id, item.name]));
  const statusColors = new Map((statuses.data ?? []).map((item) => [item.id, item.color]));
  const statusCodes = new Map((statuses.data ?? []).map((item) => [item.id, item.code]));
  const profileNames = new Map((profiles.data ?? []).map((item) => [item.id, item.display_name]));
  const latestUpdate = new Map<string, NonNullable<typeof updates.data>[number]>();
  for (const update of updates.data ?? []) {
    if (!latestUpdate.has(update.job_id)) latestUpdate.set(update.job_id, update);
  }
  const today = todayInMakassar();

  return rows.filter((row) => row.id && row.title).map((row) => {
    const pic = profileNames.get(row.pic_id ?? '') ?? 'PIC tidak tersedia';
    const update = latestUpdate.get(row.id!);
    const completed = statusCodes.get(row.status_id ?? '') === 'COMPLETED';
    return {
      id: row.id!, clientId: row.client_id ?? undefined, picId: row.pic_id ?? undefined, isDummy: false, title: row.title!,
      client: clientNames.get(row.client_id ?? '') ?? 'Client tidak tersedia',
      pic, picInitials: initials(pic),
      internalService: serviceNames.get(row.internal_service_id ?? '') ?? 'Service tidak tersedia',
      stage: row.current_step_name ?? (completed ? 'Completed' : '—'),
      progress: Math.max(0, Math.min(100, row.progress_percentage ?? 0)),
      deadline: formatDate(row.estimated_end_date), deadlineIso: row.estimated_end_date ?? '',
      deadlineNote: deadlineNote(row.estimated_end_date, completed, today),
      status: statusNames.get(row.status_id ?? '') ?? 'Unknown',
      statusColor: statusColors.get(row.status_id ?? ''),
      priority: priorityNames.get(row.priority_id ?? '') ?? 'Unknown',
      priorityColor: priorityColors.get(row.priority_id ?? ''),
      startDate: formatDate(row.start_date), estimatedEndDate: formatDate(row.estimated_end_date),
      estimatedDuration: row.estimated_duration_days === null ? '—' : `${row.estimated_duration_days} days`,
      latestUpdate: update?.message ?? 'Belum ada remark.',
      updatedBy: update ? (profileNames.get(update.created_by) ?? 'Pengguna tidak tersedia') : '',
      updatedAgo: update ? formatDate(update.progress_date) : '',
    };
  });
}
