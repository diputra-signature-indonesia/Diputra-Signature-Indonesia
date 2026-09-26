import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getAddJobOptions() {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const [clients, services, workflows, steps, priorities, profiles] = await Promise.all([
    supabase.rpc('list_active_clients_for_job'),
    supabase.from('internal_services').select('id, name, workflow_template_id').eq('is_active', true).order('name'),
    supabase.from('workflow_templates').select('id, name').eq('is_active', true),
    supabase.from('workflow_template_steps').select('workflow_template_id, name, position').order('position'),
    supabase.from('priorities').select('id, name, sort_order').eq('is_active', true).order('sort_order'),
    actor.role === 'admin' || actor.role === 'super_admin' ? supabase.rpc('list_assignable_profiles') : Promise.resolve({ data: [], error: null }),
  ]);

  const error = [clients, services, workflows, steps, priorities, profiles].find((result) => result.error)?.error;
  if (error) throw new Error(`Unable to load Add Job options: ${error.message}`);

  const workflowById = new Map((workflows.data ?? []).map((workflow) => [workflow.id, workflow.name]));
  const stepsByWorkflow = new Map<string, string[]>();
  for (const step of steps.data ?? []) {
    const names = stepsByWorkflow.get(step.workflow_template_id) ?? [];
    names.push(step.name);
    stepsByWorkflow.set(step.workflow_template_id, names);
  }

  return {
    actor: { id: actor.userId, role: actor.role, name: actor.displayName ?? actor.email ?? 'Saya' },
    clients: clients.data ?? [],
    services: (services.data ?? []).flatMap((service) => {
      const workflowId = service.workflow_template_id;
      if (!workflowId || !workflowById.has(workflowId) || !stepsByWorkflow.get(workflowId)?.length) return [];
      return [{ id: service.id, name: service.name, workflowName: workflowById.get(workflowId)!, steps: stepsByWorkflow.get(workflowId)! }];
    }),
    priorities: (priorities.data ?? []).map(({ id, name }) => ({ id, name })),
    profiles: profiles.data ?? [],
  };
}

export type AddJobOptions = Awaited<ReturnType<typeof getAddJobOptions>>;
