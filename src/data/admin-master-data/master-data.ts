export type MasterDataCategoryId = 'priorities' | 'internal-service-categories' | 'internal-services' | 'job-statuses' | 'task-statuses' | 'job-titles' | 'workflow-templates';

export type MasterDataIconName = 'priority' | 'category' | 'service' | 'job-status' | 'task-status' | 'job-title' | 'workflow';

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
  internalCategoryId?: string | null;
  internalCategoryCode?: string | null;
  referenceCount?: number;
  deletionStartedAt?: string | null;
  sopFileCount?: number;
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
  // Total catalogue size, independent of a fetched page or active filters.
  totalCount?: number;
};

export type MasterDataCategoryDefinition = Omit<MasterDataCategory, 'rows' | 'totalCount'>;

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
    id: 'internal-service-categories',
    label: 'Internal Service Categories',
    description: 'Group internal services and define consistent code prefixes. Unused categories can be deleted; used categories can be deactivated.',
    addLabel: 'Add Category',
    icon: 'category',
    columns: ['Category', 'Code Prefix', 'Internal Services', 'Status'],
  },
  {
    id: 'internal-services',
    label: 'Internal Services',
    description: 'Maintain the admin service catalogue and assign its workflow template.',
    addLabel: 'Add Service',
    icon: 'service',
    columns: ['Service', 'Code', 'Category', 'Workflow', 'Status'],
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
    id: 'job-titles',
    label: 'Job Titles',
    description: 'Manage consistent public team titles and their order on the About page.',
    addLabel: 'Add Job Title',
    icon: 'job-title',
    columns: ['Job Title', 'Code', 'Order', 'Status'],
  },
  {
    id: 'workflow-templates',
    label: 'Workflow Templates',
    description: 'Build ordered progress steps that can be assigned to internal services.',
    addLabel: 'Add Workflow',
    icon: 'workflow',
    columns: ['Template', 'Ordered Steps', 'References', 'Status'],
  },
];
