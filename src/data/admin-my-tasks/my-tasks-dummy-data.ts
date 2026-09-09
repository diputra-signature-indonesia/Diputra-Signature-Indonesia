export type MyTaskStatus = 'In Progress' | 'On Hold' | 'Obstacle' | 'Not Started' | 'Completed';

export type MyTaskItem = {
  id: string;
  detail: string;
  deadline: string;
  deadlineNote: string;
  status: MyTaskStatus;
};

export type MyTaskJob = {
  id: string;
  client: string;
  title: string;
  badgeNumber: number;
  status: MyTaskStatus;
  openCount: number;
  completedCount: number;
  dueLabel: string;
  dueTone: 'urgent' | 'warning' | 'normal';
  tasks: MyTaskItem[];
};

export const myTaskFilterOptions = {
  deadlines: ['Any Time', 'Due Today', 'Next 7 Days', 'Overdue'],
  categories: ['All Categories', 'Visa', 'Legal Document', 'Company Est.', 'Property'],
  statuses: ['Active Job', 'In Progress', 'On Hold', 'Obstacle', 'Not Started', 'Completed'],
  sortBy: ['Most Urgent', 'Newest', 'Client Name'],
};

export const myTaskJobs: MyTaskJob[] = [
  {
    id: 'job-sunji-bakti',
    client: 'PT Sunji Bakti Inc',
    title: 'Registrasi NPWP',
    badgeNumber: 6,
    status: 'In Progress',
    openCount: 4,
    completedCount: 2,
    dueLabel: 'Due in 2 days',
    dueTone: 'urgent',
    tasks: [
      { id: 'sunji-1', detail: 'Prepare the first draft of the Sale and Purchase Agreement', deadline: '15 Sep 2026', deadlineNote: 'Overdue 2 Days', status: 'On Hold' },
      { id: 'sunji-2', detail: 'Review company tax registration documents', deadline: '17 Sep 2026', deadlineNote: 'Due in 1 Day', status: 'In Progress' },
      { id: 'sunji-3', detail: 'Confirm the authorized company representative', deadline: '18 Sep 2026', deadlineNote: 'Due in 2 Days', status: 'On Hold' },
      { id: 'sunji-4', detail: 'Request the missing supporting document', deadline: '19 Sep 2026', deadlineNote: 'Waiting for Client', status: 'Obstacle' },
      { id: 'sunji-5', detail: 'Submit the registration to the tax office', deadline: '22 Sep 2026', deadlineNote: 'Due in 6 Days', status: 'Not Started' },
      { id: 'sunji-6', detail: 'Verify the issued NPWP document', deadline: '12 Sep 2026', deadlineNote: 'Completed', status: 'Completed' },
    ],
  },
  {
    id: 'job-john-doe',
    client: 'John Doe',
    title: 'KITAS Extension',
    badgeNumber: 3,
    status: 'On Hold',
    openCount: 2,
    completedCount: 1,
    dueLabel: 'Overdue by 1 day',
    dueTone: 'urgent',
    tasks: [
      { id: 'john-1', detail: 'Collect passport and sponsorship documents', deadline: '14 Sep 2026', deadlineNote: 'Overdue 1 Day', status: 'On Hold' },
      { id: 'john-2', detail: 'Submit extension application', deadline: '20 Sep 2026', deadlineNote: 'Due in 4 Days', status: 'Not Started' },
      { id: 'john-3', detail: 'Review previous immigration permit', deadline: '10 Sep 2026', deadlineNote: 'Completed', status: 'Completed' },
    ],
  },
  {
    id: 'job-maria-gonzalez',
    client: 'Maria Gonzalez',
    title: 'PMA Establishment',
    badgeNumber: 7,
    status: 'In Progress',
    openCount: 3,
    completedCount: 4,
    dueLabel: 'Due in 7 days',
    dueTone: 'normal',
    tasks: [
      { id: 'maria-1', detail: 'Draft company deed of establishment', deadline: '23 Sep 2026', deadlineNote: 'Due in 7 Days', status: 'In Progress' },
      { id: 'maria-2', detail: 'Verify shareholder identity documents', deadline: '24 Sep 2026', deadlineNote: 'Due in 8 Days', status: 'In Progress' },
      { id: 'maria-3', detail: 'Prepare business classification details', deadline: '25 Sep 2026', deadlineNote: 'Due in 9 Days', status: 'Not Started' },
    ],
  },
  {
    id: 'job-nusantara-property',
    client: 'PT Nusantara Property',
    title: 'Property Due Diligence',
    badgeNumber: 5,
    status: 'Not Started',
    openCount: 5,
    completedCount: 0,
    dueLabel: 'Due in 12 days',
    dueTone: 'normal',
    tasks: [
      { id: 'nusantara-1', detail: 'Review property ownership certificates', deadline: '28 Sep 2026', deadlineNote: 'Due in 12 Days', status: 'Not Started' },
      { id: 'nusantara-2', detail: 'Check zoning and permit compatibility', deadline: '29 Sep 2026', deadlineNote: 'Due in 13 Days', status: 'Not Started' },
    ],
  },
  {
    id: 'job-oceanic-resort',
    client: 'Oceanic Resort Bali',
    title: 'Tourism Business License',
    badgeNumber: 4,
    status: 'Obstacle',
    openCount: 3,
    completedCount: 1,
    dueLabel: 'Due in 4 days',
    dueTone: 'warning',
    tasks: [
      { id: 'oceanic-1', detail: 'Complete tourism license requirements', deadline: '20 Sep 2026', deadlineNote: 'Due in 4 Days', status: 'Obstacle' },
      { id: 'oceanic-2', detail: 'Confirm environmental permit', deadline: '21 Sep 2026', deadlineNote: 'Due in 5 Days', status: 'On Hold' },
    ],
  },
  {
    id: 'job-arta-jaya',
    client: 'PT Arta Jaya',
    title: 'Company Amendment',
    badgeNumber: 3,
    status: 'In Progress',
    openCount: 2,
    completedCount: 1,
    dueLabel: 'Due in 5 days',
    dueTone: 'normal',
    tasks: [{ id: 'arta-1', detail: 'Draft amendment of articles of association', deadline: '21 Sep 2026', deadlineNote: 'Due in 5 Days', status: 'In Progress' }],
  },
  {
    id: 'job-sakura-trading',
    client: 'Sakura Trading',
    title: 'Investor KITAS',
    badgeNumber: 2,
    status: 'On Hold',
    openCount: 2,
    completedCount: 0,
    dueLabel: 'Due tomorrow',
    dueTone: 'warning',
    tasks: [{ id: 'sakura-1', detail: 'Validate investor share ownership', deadline: '17 Sep 2026', deadlineNote: 'Due Tomorrow', status: 'On Hold' }],
  },
  {
    id: 'job-bali-creative',
    client: 'Bali Creative Studio',
    title: 'Trademark Registration',
    badgeNumber: 4,
    status: 'In Progress',
    openCount: 3,
    completedCount: 1,
    dueLabel: 'Due in 9 days',
    dueTone: 'normal',
    tasks: [{ id: 'creative-1', detail: 'Run preliminary trademark search', deadline: '25 Sep 2026', deadlineNote: 'Due in 9 Days', status: 'In Progress' }],
  },
  {
    id: 'job-green-island',
    client: 'Green Island Ventures',
    title: 'Business License Update',
    badgeNumber: 3,
    status: 'Not Started',
    openCount: 3,
    completedCount: 0,
    dueLabel: 'Due in 14 days',
    dueTone: 'normal',
    tasks: [{ id: 'green-1', detail: 'Map existing licenses and business codes', deadline: '30 Sep 2026', deadlineNote: 'Due in 14 Days', status: 'Not Started' }],
  },
  {
    id: 'job-merah-putih',
    client: 'PT Merah Putih Digital',
    title: 'Employment Agreement',
    badgeNumber: 5,
    status: 'Completed',
    openCount: 0,
    completedCount: 5,
    dueLabel: 'Completed',
    dueTone: 'normal',
    tasks: [{ id: 'merah-1', detail: 'Finalize employment agreement template', deadline: '09 Sep 2026', deadlineNote: 'Completed', status: 'Completed' }],
  },
];
