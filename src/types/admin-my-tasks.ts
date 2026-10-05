export type MyTaskItem = {
  id: string;
  detail: string;
  description: string | null;
  assigneeName: string;
  priorityName: string | null;
  version: number;
  canChangeStatus: boolean;
  dueDate: string | null;
  deadline: string;
  deadlineNote: string;
  statusId: string;
  status: string;
  statusCode: string;
  statusColor: string;
};

export type MyTaskJob = {
  id: string;
  client: string;
  title: string;
  badgeNumber: number;
  status: string;
  statusCode: string;
  statusColor: string;
  internalServiceId: string;
  internalService: string;
  createdAt: string;
  openCount: number;
  completedCount: number;
  dueDate: string | null;
  dueLabel: string;
  dueTone: 'urgent' | 'warning' | 'normal';
  statuses: Array<{ id: string; name: string; code: string; color: string; count?: number }>;
  tasks: MyTaskItem[];
};

export type MyTasksFilterState = {
  query: string;
  deadline: string;
  internalService: string;
  status: string;
  sortBy: string;
};

export type MyTaskPage = {
  jobs: MyTaskJob[];
  total: number;
  page: number;
  selected: MyTaskJob | null;
  taskTotal: number;
  taskPage: number;
  jobStatuses: { value: string; label: string }[];
  revision: string;
};
