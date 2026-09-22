import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getAllJobs } from '@/lib/supabase/queries/all-jobs';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getJobDetail(jobId: string) {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: job, error: jobError } = await supabase.from('jobs')
    .select('id,client_id,pic_id,title,description,internal_service_id,priority_id,status_id,status_reason,start_date,estimated_end_date,updated_at,version,archived_at')
    .eq('id', jobId).is('archived_at', null).maybeSingle();
  if (jobError) throw new Error(`Unable to load Job: ${jobError.message}`);
  if (!job) return null;

  const [allJobs, steps, remarks, tasks, profiles, status] = await Promise.all([
    getAllJobs(),
    supabase.from('job_steps').select('id,name,position,is_completed,version').eq('job_id', jobId).is('replaced_at', null).order('position'),
    supabase.from('job_updates').select('id,message,progress_date,created_at,created_by,performed_by,version').eq('job_id', jobId)
      .order('progress_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('tasks').select('assignee_id').eq('job_id', jobId).is('deleted_at', null),
    supabase.rpc('list_assignable_profiles'),
    supabase.from('job_statuses').select('code').eq('id', job.status_id).single(),
  ]);
  const error = [steps, remarks, tasks, profiles, status].find((result) => result.error)?.error;
  if (error) throw new Error(`Unable to load Job detail: ${error.message}`);
  const summary = allJobs.find((item) => item.id === jobId);
  if (!summary) return null;

  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.display_name]));
  const contributors = Array.from(new Set([job.pic_id, ...(tasks.data ?? []).map((task) => task.assignee_id).filter((id): id is string => Boolean(id))]))
    .map((id) => ({ id, name: names.get(id) ?? 'Pengguna tidak tersedia', role: id === job.pic_id ? 'PIC' : '' }));

  return {
    job,
    summary,
    statusCode: status.data?.code ?? 'UNKNOWN',
    canManage: actor.role === 'admin' || actor.role === 'super_admin' || actor.userId === job.pic_id,
    canChangePic: actor.role === 'admin' || actor.role === 'super_admin',
    steps: steps.data ?? [],
    remarks: (remarks.data ?? []).map((remark) => ({
      ...remark,
      createdByName: names.get(remark.created_by) ?? 'Pengguna tidak tersedia',
      performedByName: remark.performed_by ? names.get(remark.performed_by) ?? 'Pengguna tidak tersedia' : null,
    })),
    contributors,
    relatedJobs: allJobs.filter((item) => item.clientId === job.client_id && item.id !== jobId),
    profiles: profiles.data ?? [],
  };
}

export type LiveJobDetail = NonNullable<Awaited<ReturnType<typeof getJobDetail>>>;
