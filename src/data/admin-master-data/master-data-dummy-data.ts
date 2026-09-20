export type MasterDataCategoryId =
  | 'priorities'
  | 'service-categories'
  | 'internal-services'
  | 'job-statuses'
  | 'task-statuses'
  | 'workflow-templates';

export type MasterDataIconName = 'priority' | 'category' | 'service' | 'job-status' | 'task-status' | 'workflow';

export type MasterDataCell =
  | { type: 'text'; value: string; secondary?: string; mono?: boolean }
  | { type: 'badge'; value: string; tone: 'red' | 'yellow' | 'green' | 'blue' | 'gray' | 'purple' }
  | { type: 'color'; value: string; color: string }
  | { type: 'steps'; items: string[] };

export type MasterDataRow = {
  id: string;
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

const activeBadge: MasterDataCell = { type: 'badge', value: 'Active', tone: 'green' };
const systemBadge: MasterDataCell = { type: 'badge', value: 'System', tone: 'gray' };

export const masterDataCategories: MasterDataCategory[] = [
  {
    id: 'priorities',
    label: 'Priorities',
    description: 'Configure priority levels used by jobs and tasks.',
    addLabel: 'Add Priority',
    icon: 'priority',
    columns: ['Priority', 'Code', 'Color', 'Rank', 'Status'],
    rows: [
      {
        id: 'priority-high',
        cells: [
          { type: 'text', value: 'High', secondary: 'Requires immediate attention' },
          { type: 'text', value: 'HIGH', mono: true },
          { type: 'color', value: 'Red', color: '#E33434' },
          { type: 'text', value: '10' },
          activeBadge,
        ],
      },
      {
        id: 'priority-medium',
        cells: [
          { type: 'text', value: 'Medium', secondary: 'Standard operational priority' },
          { type: 'text', value: 'MEDIUM', mono: true },
          { type: 'color', value: 'Yellow', color: '#E4B400' },
          { type: 'text', value: '20' },
          activeBadge,
        ],
      },
      {
        id: 'priority-low',
        cells: [
          { type: 'text', value: 'Low', secondary: 'Can be handled after urgent work' },
          { type: 'text', value: 'LOW', mono: true },
          { type: 'color', value: 'Green', color: '#1CA35B' },
          { type: 'text', value: '30' },
          activeBadge,
        ],
      },
    ],
  },
  {
    id: 'service-categories',
    label: 'Service Categories',
    description: 'Group internal services into consistent operational categories.',
    addLabel: 'Add Category',
    icon: 'category',
    columns: ['Category', 'Code', 'Description', 'Services', 'Status'],
    rows: [
      {
        id: 'category-setup-pma',
        cells: [
          { type: 'text', value: 'Set Up PMA' },
          { type: 'text', value: 'SET_UP_PMA', mono: true },
          { type: 'text', value: 'Foreign-owned company establishment' },
          { type: 'text', value: '4 services' },
          activeBadge,
        ],
      },
      {
        id: 'category-visa',
        cells: [
          { type: 'text', value: 'Visa' },
          { type: 'text', value: 'VISA', mono: true },
          { type: 'text', value: 'Visa application and renewal services' },
          { type: 'text', value: '6 services' },
          activeBadge,
        ],
      },
      {
        id: 'category-itas',
        cells: [
          { type: 'text', value: 'ITAS' },
          { type: 'text', value: 'ITAS', mono: true },
          { type: 'text', value: 'Stay permit services for foreign nationals' },
          { type: 'text', value: '3 services' },
          activeBadge,
        ],
      },
      {
        id: 'category-real-estate',
        cells: [
          { type: 'text', value: 'Real Estate' },
          { type: 'text', value: 'REAL_ESTATE', mono: true },
          { type: 'text', value: 'Property transaction and due diligence' },
          { type: 'text', value: '5 services' },
          activeBadge,
        ],
      },
    ],
  },
  {
    id: 'internal-services',
    label: 'Internal Services',
    description: 'Maintain the service catalogue and assign its workflow template.',
    addLabel: 'Add Service',
    icon: 'service',
    columns: ['Service', 'Code', 'Category', 'Workflow', 'Status'],
    rows: [
      {
        id: 'service-kitas-renewal',
        cells: [
          { type: 'text', value: 'Investor KITAS Renewal', secondary: 'KITAS extension for company investors' },
          { type: 'text', value: 'KITAS_RENEWAL', mono: true },
          { type: 'badge', value: 'ITAS', tone: 'purple' },
          { type: 'text', value: 'Visa Workflow', secondary: '3 ordered steps' },
          activeBadge,
        ],
      },
      {
        id: 'service-pma-registration',
        cells: [
          { type: 'text', value: 'New PMA Registration', secondary: 'Foreign-owned company registration' },
          { type: 'text', value: 'PMA_REGISTRATION', mono: true },
          { type: 'badge', value: 'Set Up PMA', tone: 'blue' },
          { type: 'text', value: 'General Workflow', secondary: '5 ordered steps' },
          activeBadge,
        ],
      },
      {
        id: 'service-sale-deed',
        cells: [
          { type: 'text', value: 'Sale and Purchase Deed', secondary: 'Property transfer documentation' },
          { type: 'text', value: 'SALE_PURCHASE_DEED', mono: true },
          { type: 'badge', value: 'Real Estate', tone: 'yellow' },
          { type: 'text', value: 'General Workflow', secondary: '5 ordered steps' },
          activeBadge,
        ],
      },
      {
        id: 'service-legal-due-diligence',
        cells: [
          { type: 'text', value: 'Legal Due Diligence', secondary: 'Company and property legal audit' },
          { type: 'text', value: 'LEGAL_DUE_DILIGENCE', mono: true },
          { type: 'badge', value: 'Real Estate', tone: 'yellow' },
          { type: 'text', value: 'Not assigned', secondary: 'Required before use' },
          { type: 'badge', value: 'Inactive', tone: 'gray' },
        ],
      },
    ],
  },
  {
    id: 'job-statuses',
    label: 'Job Statuses',
    description: 'Review the fixed lifecycle statuses available to every job.',
    icon: 'job-status',
    columns: ['Status', 'Code', 'Color', 'Order', 'Type'],
    rows: [
      { id: 'job-not-started', cells: [{ type: 'text', value: 'Not Started' }, { type: 'text', value: 'NOT_STARTED', mono: true }, { type: 'color', value: 'Gray', color: '#8A94A3' }, { type: 'text', value: '10' }, systemBadge] },
      { id: 'job-in-progress', cells: [{ type: 'text', value: 'In Progress' }, { type: 'text', value: 'IN_PROGRESS', mono: true }, { type: 'color', value: 'Yellow', color: '#E4B400' }, { type: 'text', value: '20' }, systemBadge] },
      { id: 'job-on-hold', cells: [{ type: 'text', value: 'On Hold' }, { type: 'text', value: 'ON_HOLD', mono: true }, { type: 'color', value: 'Blue', color: '#194DB8' }, { type: 'text', value: '30' }, systemBadge] },
      { id: 'job-obstacle', cells: [{ type: 'text', value: 'Obstacle' }, { type: 'text', value: 'OBSTACLE', mono: true }, { type: 'color', value: 'Red', color: '#E33434' }, { type: 'text', value: '40' }, systemBadge] },
      { id: 'job-completed', cells: [{ type: 'text', value: 'Completed' }, { type: 'text', value: 'COMPLETED', mono: true }, { type: 'color', value: 'Green', color: '#1CA35B' }, { type: 'text', value: '50' }, systemBadge] },
    ],
  },
  {
    id: 'task-statuses',
    label: 'Task Statuses',
    description: 'Manage global task statuses that PICs can add to a job board.',
    addLabel: 'Add Task Status',
    icon: 'task-status',
    columns: ['Status', 'Code', 'Color', 'Order', 'Type'],
    rows: [
      { id: 'task-not-started', cells: [{ type: 'text', value: 'Not Started', secondary: 'Default board column' }, { type: 'text', value: 'NOT_STARTED', mono: true }, { type: 'color', value: 'Gray', color: '#8A94A3' }, { type: 'text', value: '10' }, systemBadge] },
      { id: 'task-in-progress', cells: [{ type: 'text', value: 'In Progress', secondary: 'Default board column' }, { type: 'text', value: 'IN_PROGRESS', mono: true }, { type: 'color', value: 'Yellow', color: '#E4B400' }, { type: 'text', value: '20' }, systemBadge] },
      { id: 'task-on-hold', cells: [{ type: 'text', value: 'On Hold' }, { type: 'text', value: 'ON_HOLD', mono: true }, { type: 'color', value: 'Blue', color: '#194DB8' }, { type: 'text', value: '30' }, systemBadge] },
      { id: 'task-obstacle', cells: [{ type: 'text', value: 'Obstacle' }, { type: 'text', value: 'OBSTACLE', mono: true }, { type: 'color', value: 'Red', color: '#E33434' }, { type: 'text', value: '40' }, systemBadge] },
      { id: 'task-completed', cells: [{ type: 'text', value: 'Completed', secondary: 'Default board column' }, { type: 'text', value: 'COMPLETED', mono: true }, { type: 'color', value: 'Green', color: '#1CA35B' }, { type: 'text', value: '50' }, systemBadge] },
    ],
  },
  {
    id: 'workflow-templates',
    label: 'Workflow Templates',
    description: 'Build ordered progress steps that can be assigned to internal services.',
    addLabel: 'Add Workflow',
    icon: 'workflow',
    columns: ['Template', 'Ordered Steps', 'Assigned Services', 'Status'],
    rows: [
      {
        id: 'workflow-general',
        cells: [
          { type: 'text', value: 'General Workflow', secondary: 'Standard company and legal service process' },
          { type: 'steps', items: ['Analysis', 'Drafting', 'Revision', 'Finalization', 'Issued'] },
          { type: 'text', value: '9 services' },
          activeBadge,
        ],
      },
      {
        id: 'workflow-visa',
        cells: [
          { type: 'text', value: 'Visa Workflow', secondary: 'Short workflow for visa and stay permits' },
          { type: 'steps', items: ['Analysis', 'Apply', 'Issue'] },
          { type: 'text', value: '6 services' },
          activeBadge,
        ],
      },
    ],
  },
];
