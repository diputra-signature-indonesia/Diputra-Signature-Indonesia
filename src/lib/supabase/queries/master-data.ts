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

  const [priorityResult, jobStatusResult, taskStatusResult, jobTitleResult, workflowResult, stepResult, internalCategoryResult, catalogueCountResult] = await Promise.all([
    supabase.from('priorities').select('id, code, name, color, sort_order, is_active, is_system, version').order('sort_order').order('name'),
    supabase.from('job_statuses').select('id, code, name, color, sort_order, is_active, is_system, version').order('sort_order').order('name'),
    supabase.from('task_statuses').select('id, code, name, color, sort_order, is_active, is_system, version').order('sort_order').order('name'),
    supabase.from('job_titles').select('id, code, name, sort_order, is_active, version').order('sort_order').order('name'),
    supabase.from('workflow_templates').select('id, code, name, description, is_active, version').order('name'),
    supabase.from('workflow_template_steps').select('id, workflow_template_id, name, position').order('position'),
    supabase.from('internal_service_categories').select('id,code,name,version').order('name').order('id'),
    supabase.rpc('internal_service_catalogue_counts'),
  ]);

  const priorities = ensureResult('priorities', priorityResult);
  const jobStatuses = ensureResult('Job statuses', jobStatusResult);
  const taskStatuses = ensureResult('Task statuses', taskStatusResult);
  const jobTitles = ensureResult('Job titles', jobTitleResult);
  const workflows = ensureResult('workflow templates', workflowResult);
  const steps = ensureResult('workflow steps', stepResult);
  const internalCategories = ensureResult('internal service categories', internalCategoryResult);
  const catalogueCounts = ensureResult('internal service counts', catalogueCountResult) as { categories: Record<string, number>; workflows: Record<string, number> };
  const serviceCountByCategory = new Map(Object.entries(catalogueCounts.categories));

  const stepNamesByWorkflow = new Map<string, string[]>();
  const serviceCountByWorkflow = new Map(Object.entries(catalogueCounts.workflows));

  for (const step of steps) {
    const current = stepNamesByWorkflow.get(step.workflow_template_id) ?? [];
    current.push(step.name);
    stepNamesByWorkflow.set(step.workflow_template_id, current);
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
    'internal-service-categories': internalCategories.map((category) => ({
      id: category.id,
      code: category.code,
      version: category.version,
      isActive: true,
      referenceCount: serviceCountByCategory.get(category.id) ?? 0,
      cells: [
        { type: 'text', value: category.name },
        { type: 'text', value: category.code, mono: true },
        { type: 'text', value: String(serviceCountByCategory.get(category.id) ?? 0) },
      ],
    })),
    // Service rows are requested separately through server-side pagination.
    'internal-services': [],
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
