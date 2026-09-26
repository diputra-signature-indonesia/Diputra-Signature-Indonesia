import 'server-only';

import { masterDataCategoryDefinitions, type MasterDataCategory, type MasterDataCell, type MasterDataRow } from '@/data/admin-master-data/master-data';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const activeBadge = (isActive: boolean): MasterDataCell => (isActive ? { type: 'badge', value: 'Active', tone: 'green' } : { type: 'badge', value: 'Inactive', tone: 'gray' });

const systemBadge = (isSystem: boolean): MasterDataCell => ({
  type: 'badge',
  value: isSystem ? 'System' : 'Custom',
  tone: isSystem ? 'gray' : 'purple',
});

function ensureResult<T>(label: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(`Unable to load ${label}: ${result.error.message}`);
  }

  return result.data ?? ([] as T);
}

export async function getMasterDataCategories(): Promise<MasterDataCategory[]> {
  const supabase = await createSupabaseServerClient();

  const [priorityResult, publicCategoryResult, serviceResult, jobStatusResult, taskStatusResult, jobTitleResult, workflowResult, stepResult] = await Promise.all([
    supabase.from('priorities').select('id, code, name, color, sort_order, is_active, is_system, version').order('sort_order').order('name'),
    supabase.from('services_categories').select('id, title, short_description, slug, type, is_published, sort_order').order('sort_order').order('title'),
    supabase.from('internal_services').select('id, code, name, summary, workflow_template_id, is_active, version').order('name'),
    supabase.from('job_statuses').select('id, code, name, color, sort_order, is_active, is_system, version').order('sort_order').order('name'),
    supabase.from('task_statuses').select('id, code, name, color, sort_order, is_active, is_system, version').order('sort_order').order('name'),
    supabase.from('job_titles').select('id, code, name, sort_order, is_active, version').order('sort_order').order('name'),
    supabase.from('workflow_templates').select('id, code, name, description, is_active, version').order('name'),
    supabase.from('workflow_template_steps').select('id, workflow_template_id, name, position').order('position'),
  ]);

  const priorities = ensureResult('priorities', priorityResult);
  const publicCategories = ensureResult('service categories', publicCategoryResult);
  const services = ensureResult('internal services', serviceResult);
  const jobStatuses = ensureResult('Job statuses', jobStatusResult);
  const taskStatuses = ensureResult('Task statuses', taskStatusResult);
  const jobTitles = ensureResult('Job titles', jobTitleResult);
  const workflows = ensureResult('workflow templates', workflowResult);
  const steps = ensureResult('workflow steps', stepResult);

  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const stepNamesByWorkflow = new Map<string, string[]>();
  const serviceCountByWorkflow = new Map<string, number>();

  for (const step of steps) {
    const current = stepNamesByWorkflow.get(step.workflow_template_id) ?? [];
    current.push(step.name);
    stepNamesByWorkflow.set(step.workflow_template_id, current);
  }

  for (const service of services) {
    if (!service.workflow_template_id) continue;
    serviceCountByWorkflow.set(service.workflow_template_id, (serviceCountByWorkflow.get(service.workflow_template_id) ?? 0) + 1);
  }

  const rowsByCategory: Record<MasterDataCategory['id'], MasterDataRow[]> = {
    priorities: priorities.map((priority) => ({
      id: priority.id,
      code: priority.code,
      version: priority.version,
      isActive: priority.is_active,
      isSystem: priority.is_system,
      cells: [
        { type: 'text', value: priority.name },
        { type: 'text', value: priority.code, mono: true },
        { type: 'color', value: priority.color, color: priority.color },
        { type: 'text', value: String(priority.sort_order) },
        activeBadge(priority.is_active),
      ],
    })),
    'service-categories': publicCategories.map((category) => ({
      id: category.id,
      version: 1,
      isActive: Boolean(category.is_published),
      cells: [
        { type: 'text', value: category.title?.trim() || category.slug, secondary: category.short_description ?? undefined },
        { type: 'text', value: category.slug, mono: true },
        { type: 'badge', value: category.type === 'primary' ? 'Primary' : 'Secondary', tone: category.type === 'primary' ? 'blue' : 'purple' },
        category.is_published ? { type: 'badge', value: 'Published', tone: 'green' } : { type: 'badge', value: 'Draft', tone: 'gray' },
      ],
    })),
    'internal-services': services.map((service) => {
      const workflow = service.workflow_template_id ? workflowById.get(service.workflow_template_id) : undefined;
      const stepCount = service.workflow_template_id ? (stepNamesByWorkflow.get(service.workflow_template_id)?.length ?? 0) : 0;

      return {
        id: service.id,
        code: service.code,
        version: service.version,
        isActive: service.is_active,
        workflowTemplateId: service.workflow_template_id,
        cells: [
          { type: 'text', value: service.name, secondary: service.summary ?? undefined },
          { type: 'text', value: service.code, mono: true },
          {
            type: 'text',
            value: workflow?.name ?? 'Not assigned',
            secondary: workflow ? `${stepCount} ordered ${stepCount === 1 ? 'step' : 'steps'}` : 'Required before use',
          },
          activeBadge(service.is_active),
        ],
      };
    }),
    'job-statuses': jobStatuses.map((status) => ({
      id: status.id,
      code: status.code,
      version: status.version,
      isActive: status.is_active,
      isSystem: status.is_system,
      cells: [
        { type: 'text', value: status.name },
        { type: 'text', value: status.code, mono: true },
        { type: 'color', value: status.color, color: status.color },
        { type: 'text', value: String(status.sort_order) },
        activeBadge(status.is_active),
        systemBadge(status.is_system),
      ],
    })),
    'task-statuses': taskStatuses.map((status) => ({
      id: status.id,
      code: status.code,
      version: status.version,
      isActive: status.is_active,
      isSystem: status.is_system,
      cells: [
        { type: 'text', value: status.name },
        { type: 'text', value: status.code, mono: true },
        { type: 'color', value: status.color, color: status.color },
        { type: 'text', value: String(status.sort_order) },
        activeBadge(status.is_active),
        systemBadge(status.is_system),
      ],
    })),
    'job-titles': jobTitles.map((title) => ({
      id: title.id,
      code: title.code,
      version: title.version,
      isActive: title.is_active,
      cells: [{ type: 'text', value: title.name }, { type: 'text', value: title.code, mono: true }, { type: 'text', value: String(title.sort_order) }, activeBadge(title.is_active)],
    })),
    'workflow-templates': workflows.map((workflow) => {
      const serviceCount = serviceCountByWorkflow.get(workflow.id) ?? 0;

      return {
        id: workflow.id,
        code: workflow.code,
        version: workflow.version,
        isActive: workflow.is_active,
        cells: [
          { type: 'text', value: workflow.name, secondary: workflow.description ?? undefined },
          { type: 'steps', items: stepNamesByWorkflow.get(workflow.id) ?? [] },
          { type: 'text', value: `${serviceCount} ${serviceCount === 1 ? 'service' : 'services'}` },
          activeBadge(workflow.is_active),
        ],
      };
    }),
  };

  return masterDataCategoryDefinitions.map((category) => ({ ...category, rows: rowsByCategory[category.id] }));
}
