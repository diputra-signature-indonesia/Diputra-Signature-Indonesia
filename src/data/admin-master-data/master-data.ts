export type MasterDataCategoryId = 'priorities' | 'service-categories' | 'internal-services' | 'job-statuses' | 'task-statuses' | 'workflow-templates';

export type MasterDataIconName = 'priority' | 'category' | 'service' | 'job-status' | 'task-status' | 'workflow';

export type MasterDataCell =
  | { type: 'text'; value: string; secondary?: string; mono?: boolean }
  | { type: 'badge'; value: string; tone: 'red' | 'yellow' | 'green' | 'blue' | 'gray' | 'purple' }
  | { type: 'color'; value: string; color: string }
  | { type: 'steps'; items: string[] };

export type MasterDataRow = {
  id: string;
  code?: string;
  version: number;
  isActive: boolean;
  isSystem?: boolean;
  workflowTemplateId?: string | null;
  cells: MasterDataCell[];
};

export type MasterDataCategory = {
  id: MasterDataCategoryId;
  label: string;
  description: string;
  addLabel?: string;
  icon: MasterDataIconName;
  columns: string[];
  rows: MasterDataRow[];
};

export type MasterDataCategoryDefinition = Omit<MasterDataCategory, 'rows'>;

export const masterDataCategoryDefinitions: MasterDataCategoryDefinition[] = [
  {
    id: 'priorities',
    label: 'Priorities',
    description: 'Configure priority levels used by jobs and tasks.',
    addLabel: 'Add Priority',
    icon: 'priority',
    columns: ['Priority', 'Code', 'Color', 'Rank', 'Status'],
  },
  {
    id: 'service-categories',
    label: 'Service Categories',
    description: 'View service categories displayed on the landing and client pages.',
    icon: 'category',
    columns: ['Category', 'Slug', 'Type', 'Published'],
  },
  {
    id: 'internal-services',
    label: 'Internal Services',
    description: 'Maintain the admin service catalogue and assign its workflow template.',
    addLabel: 'Add Service',
    icon: 'service',
    columns: ['Service', 'Code', 'Workflow', 'Status'],
  },
  {
    id: 'job-statuses',
    label: 'Job Statuses',
    description: 'Manage the lifecycle statuses available to jobs.',
    addLabel: 'Add Job Status',
    icon: 'job-status',
    columns: ['Status', 'Code', 'Color', 'Order', 'Availability', 'Type'],
  },
  {
    id: 'task-statuses',
    label: 'Task Statuses',
    description: 'Manage global task statuses that PICs can add to a job board.',
    addLabel: 'Add Task Status',
    icon: 'task-status',
    columns: ['Status', 'Code', 'Color', 'Order', 'Availability', 'Type'],
  },
  {
    id: 'workflow-templates',
    label: 'Workflow Templates',
    description: 'Build ordered progress steps that can be assigned to internal services.',
    addLabel: 'Add Workflow',
    icon: 'workflow',
    columns: ['Template', 'Ordered Steps', 'Assigned Services', 'Status'],
  },
];
