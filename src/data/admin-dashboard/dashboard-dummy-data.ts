export type DashboardMetricIcon = 'active' | 'not-started' | 'in-progress' | 'delayed' | 'completed' | 'near-deadline' | 'due-today' | 'overdue';

export type DashboardMetricTone = 'brand' | 'neutral' | 'yellow' | 'red' | 'green';

export type DashboardMetric = {
  label: string;
  value: number;
  icon: DashboardMetricIcon;
  tone: DashboardMetricTone;
};

export type PicTaskLoad = {
  name: string;
  notStarted: number;
  inProgress: number;
  delayed: number;
};

export type TaskInternalServiceSummary = {
  label: string;
  value: number;
  color: string;
};

export type AttentionTask = {
  id: string;
  client: string;
  task: string;
  pic: string;
  internalService: string;
  priority: 'High' | 'Medium';
  status: 'On Hold' | 'On Progress';
  progress: number;
  deadline: string;
};

export const dashboardMetrics: DashboardMetric[] = [
  { label: 'Total Task Aktif', value: 24, icon: 'active', tone: 'brand' },
  { label: 'Belum Dimulai', value: 6, icon: 'not-started', tone: 'neutral' },
  { label: 'Dalam Proses', value: 14, icon: 'in-progress', tone: 'yellow' },
  { label: 'Tertunda', value: 4, icon: 'delayed', tone: 'red' },
  { label: 'Selesai', value: 18, icon: 'completed', tone: 'green' },
  { label: 'Mendekati Deadline', value: 5, icon: 'near-deadline', tone: 'yellow' },
  { label: 'Deadline Hari Ini', value: 2, icon: 'due-today', tone: 'brand' },
  { label: 'Melewati Deadline', value: 3, icon: 'overdue', tone: 'red' },
];

export const picTaskLoads: PicTaskLoad[] = [
  { name: 'Putra', notStarted: 2, inProgress: 4, delayed: 2 },
  { name: 'Rhea', notStarted: 1, inProgress: 4, delayed: 1 },
  { name: 'Ayu', notStarted: 0, inProgress: 4, delayed: 1 },
  { name: 'Dewa', notStarted: 3, inProgress: 2, delayed: 0 },
];

export const internalServiceSummary: TaskInternalServiceSummary[] = [
  { label: 'Investor KITAS', value: 12, color: '#7B0000' },
  { label: 'Legal Due Diligence', value: 7, color: '#F2C900' },
  { label: 'PMA Establishment', value: 5, color: '#9CA3AF' },
  { label: 'Property Due Diligence', value: 6, color: '#E5E7EB' },
];

export const attentionTasks: AttentionTask[] = [
  {
    id: 'task-001',
    client: 'PT. SUNJI BAKTI INC',
    task: 'Registrasi NPWP',
    pic: 'Putra',
    internalService: 'Tax Registration',
    priority: 'High',
    status: 'On Hold',
    progress: 45,
    deadline: 'Due Today',
  },
  {
    id: 'task-002',
    client: 'PT Bali Sejahtera',
    task: 'Drafting Akta Jual Beli',
    pic: 'Rhea',
    internalService: 'Sale and Purchase Deed',
    priority: 'Medium',
    status: 'On Progress',
    progress: 80,
    deadline: 'H-1',
  },
  {
    id: 'task-003',
    client: 'Maria Gonzalez',
    task: 'Pendaftaran PMA Baru',
    pic: 'Dewa',
    internalService: 'PMA Establishment',
    priority: 'High',
    status: 'On Hold',
    progress: 20,
    deadline: 'Lewat +2h',
  },
];

export const dashboardFilterOptions = {
  pics: ['All Assignees', 'Putra', 'Rhea', 'Ayu', 'Dewa'],
  clients: ['All Clients', 'PT. SUNJI BAKTI INC', 'PT Bali Sejahtera', 'Maria Gonzalez'],
  statuses: ['All Statuses', 'Not Started', 'On Progress', 'On Hold', 'Completed'],
  internalServices: ['All Internal Services', 'Tax Registration', 'Investor KITAS', 'Sale and Purchase Deed', 'Legal Due Diligence', 'PMA Establishment', 'Property Due Diligence'],
};
