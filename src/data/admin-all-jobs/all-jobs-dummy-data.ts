export type AllJobStatus = string;
export type AllJobPriority = string;

export type AllJob = {
  id: string;
  clientId?: string;
  picId?: string;
  isDummy: boolean;
  title: string;
  client: string;
  pic: string;
  picInitials: string;
  internalService: string;
  stage: string;
  progress: number;
  deadline: string;
  deadlineIso: string;
  deadlineNote: string;
  status: AllJobStatus;
  statusColor?: string;
  priority: AllJobPriority;
  priorityColor?: string;
  startDate: string;
  estimatedEndDate: string;
  estimatedDuration: string;
  latestUpdate: string;
  updatedBy: string;
  updatedAgo: string;
};

export type AllJobsFilterState = {
  query: string;
  pic: string;
  internalService: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  priority: string;
  deadline: string;
  groupBy: string;
};

export const allJobsFilterOptions = {
  deadlines: ['Any Time', 'Due Today', 'Next 7 Days', 'Overdue'],
  groupBy: ['None', 'Client', 'PIC', 'Internal Service', 'Status', 'Priority'],
};

export const initialAllJobsFilters: AllJobsFilterState = {
  query: '',
  pic: 'All Assignees',
  internalService: 'All Internal Services',
  status: 'All Statuses',
  dateFrom: '',
  dateTo: '',
  priority: 'All Priorities',
  deadline: allJobsFilterOptions.deadlines[0],
  groupBy: allJobsFilterOptions.groupBy[0],
};

const jobTemplates: Omit<AllJob, 'id'>[] = [
  {
    isDummy: true, title: 'Registrasi NPWP', client: 'PT. Sunji Bakti Inc', pic: 'Dalem', picInitials: 'DA', internalService: 'Tax Registration', stage: 'Revision', progress: 40,
    deadline: '15 Sep 2026', deadlineIso: '2026-09-15', deadlineNote: 'Overdue 2 Days', status: 'On Hold', priority: 'High', startDate: '01 Sep 2026',
    estimatedEndDate: '15 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Waiting for final document from Tax Office', updatedBy: 'Dalem', updatedAgo: '3 days ago',
  },
  {
    isDummy: true, title: 'Terminated Stay Permit (TSP)', client: 'PT. Sunji Bakti Inc', pic: 'Dalem', picInitials: 'DA', internalService: 'Stay Permit Termination', stage: 'Review', progress: 40,
    deadline: '17 Sep 2026', deadlineIso: '2026-09-17', deadlineNote: 'Due in 1 Day', status: 'On Hold', priority: 'High', startDate: '03 Sep 2026',
    estimatedEndDate: '17 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Immigration documents are being reviewed', updatedBy: 'Dalem', updatedAgo: '1 day ago',
  },
  {
    isDummy: true, title: 'KITAS Investor 2 Years', client: 'PT. Sunji Bakti Inc', pic: 'Putra', picInitials: 'PU', internalService: 'Investor KITAS', stage: 'Drafting', progress: 20,
    deadline: '20 Sep 2026', deadlineIso: '2026-09-20', deadlineNote: 'Due in 4 Days', status: 'In Progress', priority: 'High', startDate: '06 Sep 2026',
    estimatedEndDate: '20 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Sponsor letter draft has been prepared', updatedBy: 'Putra', updatedAgo: '5 hours ago',
  },
  {
    isDummy: true, title: 'PMA Establishment', client: 'Maria Gonzalez', pic: 'Rhea', picInitials: 'RH', internalService: 'PMA Establishment', stage: 'Analysis', progress: 10,
    deadline: '23 Sep 2026', deadlineIso: '2026-09-23', deadlineNote: 'Due in 7 Days', status: 'In Progress', priority: 'Medium', startDate: '09 Sep 2026',
    estimatedEndDate: '23 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Shareholder documents have been received', updatedBy: 'Rhea', updatedAgo: '2 hours ago',
  },
  {
    isDummy: true, title: 'Property Due Diligence', client: 'PT Nusantara Property', pic: 'Dewa', picInitials: 'DE', internalService: 'Property Due Diligence', stage: 'Document Check', progress: 55,
    deadline: '28 Sep 2026', deadlineIso: '2026-09-28', deadlineNote: 'Due in 12 Days', status: 'In Progress', priority: 'Medium', startDate: '08 Sep 2026',
    estimatedEndDate: '28 Sep 2026', estimatedDuration: '20 Days', latestUpdate: 'Land certificate validation is in progress', updatedBy: 'Dewa', updatedAgo: '4 hours ago',
  },
];

export const allJobsDummy: AllJob[] = jobTemplates.map((template, index) => ({
  ...template,
  id: `job-${index + 1}`,
  title: `${template.title} (dummy)`,
}));
