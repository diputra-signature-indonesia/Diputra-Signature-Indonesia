import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getJobActionDetail(jobId: string) {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id,client_id,pic_id,title,description,internal_service_id,priority_id,status_id,status_reason,start_date,estimated_end_date,updated_at,version,archived_at')
    .eq('id', jobId)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!job) return null;
  const [client, service, priority, status, profiles, steps] = await Promise.all([
    supabase.from('clients').select('name').eq('id', job.client_id).single(),
    supabase.from('internal_services').select('name').eq('id', job.internal_service_id).single(),
    supabase.from('priorities').select('name').eq('id', job.priority_id).single(),
    supabase.from('job_statuses').select('code').eq('id', job.status_id).single(),
    supabase.rpc('list_assignable_profiles').eq('id', job.pic_id),
    supabase.from('job_steps').select('name').eq('job_id', job.id).is('replaced_at', null).order('position'),
  ]);
  const labelError = [client, service, priority, status, profiles, steps].find((result) => result.error)?.error;
  if (labelError) throw labelError;
  return {
    job,
    statusCode: status.data?.code ?? 'UNKNOWN',
    canManage: actor.role === 'admin' || actor.role === 'super_admin' || actor.userId === job.pic_id,
    canChangePic: actor.role === 'admin' || actor.role === 'super_admin',
    summary: { client: client.data!.name, internalService: service.data!.name, priority: priority.data!.name, pic: profiles.data?.[0]?.display_name ?? 'PIC tidak tersedia' },
    steps: steps.data ?? [],
  };
}

export type JobActionDetail = NonNullable<Awaited<ReturnType<typeof getJobActionDetail>>>;
