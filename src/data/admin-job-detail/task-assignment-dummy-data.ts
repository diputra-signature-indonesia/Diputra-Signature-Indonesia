export type TaskAssignmentStatus = 'Not Started' | 'In Progress' | 'Completed';
export type TaskAssignmentPriority = 'High' | 'Medium' | 'Low';

export type TaskAssignmentItem = {
  id: string;
  title: string;
  assignee: string;
  initials: string;
  dueDate: string;
  dueLabel: string;
  priority: TaskAssignmentPriority;
  status: TaskAssignmentStatus;
  isDraft?: boolean;
};

export type TaskAssignmentFilterState = {
  query: string;
  pic: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  priority: string;
};

export const taskAssignmentStatuses: TaskAssignmentStatus[] = ['Not Started', 'In Progress', 'Completed'];

export const taskAssignmentFilterOptions = {
  pics: ['All Assignees', 'Dalem', 'Rinjani', 'Putra', 'Rhea', 'Dewa'],
  statuses: ['All Statuses', ...taskAssignmentStatuses],
  priorities: ['All Priorities', 'High', 'Medium', 'Low'],
};

export const initialTaskAssignmentFilters: TaskAssignmentFilterState = {
  query: '',
  pic: taskAssignmentFilterOptions.pics[0],
  dateFrom: '',
  dateTo: '',
  status: taskAssignmentFilterOptions.statuses[0],
  priority: taskAssignmentFilterOptions.priorities[0],
};

export const initialTaskAssignments: TaskAssignmentItem[] = [
  {
    id: 'task-assignment-1',
    title: 'Collect the director’s identification documents',
    assignee: 'Dalem',
    initials: 'DA',
    dueDate: '2026-08-10',
    dueLabel: 'due: 10 Aug 2026',
    priority: 'High',
    status: 'Not Started',
  },
  {
    id: 'task-assignment-2',
    title: 'Prepare the tax registration checklist',
    assignee: 'Rinjani',
    initials: 'RI',
    dueDate: '2026-08-10',
    dueLabel: 'due: 10 Aug 2026',
    priority: 'Medium',
    status: 'Not Started',
  },
  {
    id: 'task-assignment-3',
    title: 'Verify the submitted NPWP documents',
    assignee: 'Dalem',
    initials: 'P',
    dueDate: '2026-09-09',
    dueLabel: 'due: Today',
    priority: 'High',
    status: 'In Progress',
  },
  {
    id: 'task-assignment-4',
    title: 'Confirm the revised tax documents',
    assignee: 'Dalem',
    initials: 'P',
    dueDate: '2026-09-08',
    dueLabel: 'Overdue 1 day',
    priority: 'High',
    status: 'In Progress',
  },
  {
    id: 'task-assignment-5',
    title: 'Create the initial client document checklist',
    assignee: 'Dalem',
    initials: 'P',
    dueDate: '2026-08-10',
    dueLabel: 'due: 10 Aug 2026',
    priority: 'Medium',
    status: 'Completed',
  },
  {
    id: 'task-assignment-6',
    title: 'Check the company deed information',
    assignee: 'Dalem',
    initials: 'P',
    dueDate: '2026-08-10',
    dueLabel: 'due: 10 Aug 2026',
    priority: 'Low',
    status: 'Completed',
  },
];
