export type DashboardMetricIcon = 'active' | 'not-started' | 'in-progress' | 'delayed' | 'completed' | 'near-deadline' | 'due-today' | 'overdue';

export type DashboardMetricTone = 'brand' | 'neutral' | 'yellow' | 'red' | 'green';

export type DashboardMetric = {
  label: string;
  value: number;
  icon: DashboardMetricIcon;
  tone: DashboardMetricTone;
};

export type PicTaskLoad = {
  id: string;
  name: string;
  notStarted: number;
  inProgress: number;
  delayed: number;
};

export type TaskInternalServiceSummary = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type AttentionTask = {
  id: string;
  jobId: string;
  client: string;
  task: string;
  pic: string;
  internalService: string;
  priority: string;
  priorityColor: string;
  status: string;
  statusColor: string;
  progress: number;
  deadline: string;
  deadlineTone: 'urgent' | 'warning' | 'normal';
};

export type DashboardTaskRecord = {
  id: string;
  jobId: string;
  title: string;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string;
  clientId: string;
  clientName: string;
  internalServiceId: string;
  internalServiceName: string;
  priorityName: string;
  priorityColor: string;
  statusId: string;
  statusName: string;
  statusCode: string;
  statusColor: string;
  progress: number;
};

export type DashboardFilterOption = { value: string; label: string };

export type DashboardFilterOptions = {
  pics: DashboardFilterOption[];
  clients: DashboardFilterOption[];
  statuses: DashboardFilterOption[];
  internalServices: DashboardFilterOption[];
};

export type DashboardData = {
  tasks: DashboardTaskRecord[];
  filterOptions: DashboardFilterOptions;
};
