export type MyTaskItem = {
  id: string;
  detail: string;
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
  statuses: Array<{ id: string; name: string; code: string; color: string }>;
  tasks: MyTaskItem[];
};

export type MyTasksFilterState = {
  query: string;
  deadline: string;
  internalService: string;
  status: string;
  sortBy: string;
};
