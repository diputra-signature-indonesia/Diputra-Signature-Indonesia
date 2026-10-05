import 'server-only';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Only small configuration lists are sent with the page. Growing catalogues
// (clients, services, PIC) use bounded remote lookups when the field is opened.
export async function getAddJobOptions() {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const [priorities, statuses] = await Promise.all([
    supabase.from('priorities').select('id,name').eq('is_active', true).order('sort_order'),
    supabase.from('job_statuses').select('id,name,code').eq('is_active', true).order('sort_order'),
  ]);
  if (priorities.error || statuses.error) throw priorities.error ?? statuses.error;
  return { actor: { id: actor.userId, role: actor.role, name: actor.displayName ?? actor.email ?? 'Saya' }, priorities: priorities.data ?? [], statuses: statuses.data ?? [] };
}
export type AddJobOptions = Awaited<ReturnType<typeof getAddJobOptions>>;
