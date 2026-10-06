import 'server-only';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getAdminJobPage } from '@/lib/supabase/queries/all-jobs';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';
type Remark = Pick<Tables<'job_updates'>, 'id' | 'message' | 'progress_date' | 'created_at' | 'created_by' | 'performed_by' | 'version'> & { createdByName: string; performedByName: string | null };

export async function getJobDetail(jobId: string, includePanels = true) {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id,client_id,pic_id,title,description,internal_service_id,priority_id,status_id,status_reason,start_date,estimated_end_date,updated_at,version,archived_at,deletion_started_at')
    .eq('id', jobId)
    .is('archived_at', null)
    .maybeSingle();
  if (jobError) throw new Error('Unable to load Job.');
  if (!job) return null;
  const [summaryPage, steps, remarks, contributorsResult, status] = await Promise.all([
    getAdminJobPage({ status: 'ALL' }, 1, { jobId }),
    includePanels
      ? supabase.from('job_steps').select('id,name,position,is_completed,version').eq('job_id', jobId).is('replaced_at', null).order('position')
      : Promise.resolve({ data: [], error: null }),
    includePanels ? supabase.rpc('search_job_remarks', { p_job_id: jobId, p_page: 1 }) : Promise.resolve({ data: { rows: [], total: 0, page: 1 }, error: null }),
    includePanels ? supabase.from('job_contributors').select('profile_id,added_at').eq('job_id', jobId).order('added_at').order('profile_id') : Promise.resolve({ data: [], error: null }),
    supabase.from('job_statuses').select('code').eq('id', job.status_id).single(),
  ]);
  if ([steps, remarks, contributorsResult, status].some((result) => result.error)) throw new Error('Unable to load Job detail.');
  const summary = summaryPage.jobs[0];
  if (!summary) return null;
  const contributorIds = [...new Set([job.pic_id, ...(contributorsResult.data ?? []).map((row) => row.profile_id)])];
  const profiles = includePanels ? await supabase.rpc('list_assignable_profiles').in('id', contributorIds) : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const assigneeCounts =
    includePanels && contributorIds.length
      ? await supabase.from('profiles').select('id,tasks!tasks_assignee_id_fkey(count)').in('id', contributorIds).eq('tasks.job_id', jobId).is('tasks.deleted_at', null)
      : { data: [], error: null };
  if (assigneeCounts.error) throw assigneeCounts.error;
  const activeAssignees = new Set((assigneeCounts.data ?? []).filter((profile) => (profile.tasks[0]?.count ?? 0) > 0).map((profile) => profile.id));
  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.display_name]));
  const remarkPage = remarks.data as unknown as { rows: Remark[]; total: number; page: number };
  return {
    job,
    summary,
    statusCode: status.data?.code ?? 'UNKNOWN',
    canManage: !job.deletion_started_at && (actor.role === 'admin' || actor.role === 'super_admin' || actor.userId === job.pic_id),
    canChangePic: actor.role === 'admin' || actor.role === 'super_admin',
    steps: steps.data ?? [],
    remarks: remarkPage.rows,
    remarkTotal: remarkPage.total,
    revision: String(Date.now()),
    contributors: contributorIds.map((id) => ({
      id,
      name: names.get(id) ?? 'Pengguna tidak tersedia',
      role: id === job.pic_id ? 'PIC' : 'Contributor',
      canRemove: id !== job.pic_id && !activeAssignees.has(id),
    })),
    relatedJobs: [],
    profiles: profiles.data ?? [],
  };
}
export type LiveJobDetail = NonNullable<Awaited<ReturnType<typeof getJobDetail>>>;
