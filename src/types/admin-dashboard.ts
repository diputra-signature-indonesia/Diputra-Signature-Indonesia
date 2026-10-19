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

export type JobInternalServiceSummary = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type AttentionJob = {
  id: string;
  client: string;
  title: string;
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

export type DashboardFilterOption = { value: string; label: string };

export type DashboardFilterOptions = {
  pics: DashboardFilterOption[];
  clients: DashboardFilterOption[];
  statuses: DashboardFilterOption[];
  internalServices: DashboardFilterOption[];
};

export type DashboardData = {
  metrics: DashboardMetric[];
  taskLoads: PicTaskLoad[];
  internalServices: JobInternalServiceSummary[];
  attentionJobs: AttentionJob[];
  revision: string;
  filterOptions: DashboardFilterOptions;
};
