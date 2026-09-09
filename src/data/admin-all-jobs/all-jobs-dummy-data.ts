export type AllJobStatus = 'In Progress' | 'On Hold' | 'Not Started' | 'Obstacle' | 'Completed';
export type AllJobPriority = 'High' | 'Medium' | 'Low';

export type AllJob = {
  id: string;
  title: string;
  client: string;
  pic: string;
  picInitials: string;
  category: string;
  stage: string;
  progress: number;
  deadline: string;
  deadlineIso: string;
  deadlineNote: string;
  status: AllJobStatus;
  priority: AllJobPriority;
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
  category: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  priority: string;
  deadline: string;
  groupBy: string;
};

export const allJobsFilterOptions = {
  pics: ['All Assignees', 'Dalem', 'Putra', 'Rhea', 'Ayu', 'Dewa'],
  categories: ['All Categories', 'Setup PMA', 'Visa', 'Legal Document', 'Property'],
  statuses: ['All Statuses', 'In Progress', 'On Hold', 'Not Started', 'Obstacle', 'Completed'],
  priorities: ['All Priorities', 'High', 'Medium', 'Low'],
  deadlines: ['Any Time', 'Due Today', 'Next 7 Days', 'Overdue'],
  groupBy: ['None', 'Client', 'PIC', 'Category', 'Status', 'Priority'],
};

export const initialAllJobsFilters: AllJobsFilterState = {
  query: '',
  pic: allJobsFilterOptions.pics[0],
  category: allJobsFilterOptions.categories[0],
  status: allJobsFilterOptions.statuses[0],
  dateFrom: '',
  dateTo: '',
  priority: allJobsFilterOptions.priorities[0],
  deadline: allJobsFilterOptions.deadlines[0],
  groupBy: allJobsFilterOptions.groupBy[0],
};

const jobTemplates: Omit<AllJob, 'id'>[] = [
  {
    title: 'Registrasi NPWP', client: 'PT. Sunji Bakti Inc', pic: 'Dalem', picInitials: 'DA', category: 'Setup PMA', stage: 'Revision', progress: 40,
    deadline: '15 Sep 2026', deadlineIso: '2026-09-15', deadlineNote: 'Overdue 2 Days', status: 'On Hold', priority: 'High', startDate: '01 Sep 2026',
    estimatedEndDate: '15 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Waiting for final document from Tax Office', updatedBy: 'Dalem', updatedAgo: '3 days ago',
  },
  {
    title: 'Terminated Stay Permit (TSP)', client: 'PT. Sunji Bakti Inc', pic: 'Dalem', picInitials: 'DA', category: 'Visa', stage: 'Review', progress: 40,
    deadline: '17 Sep 2026', deadlineIso: '2026-09-17', deadlineNote: 'Due in 1 Day', status: 'On Hold', priority: 'High', startDate: '03 Sep 2026',
    estimatedEndDate: '17 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Immigration documents are being reviewed', updatedBy: 'Dalem', updatedAgo: '1 day ago',
  },
  {
    title: 'KITAS Investor 2 Years', client: 'PT. Sunji Bakti Inc', pic: 'Putra', picInitials: 'PU', category: 'Visa', stage: 'Drafting', progress: 20,
    deadline: '20 Sep 2026', deadlineIso: '2026-09-20', deadlineNote: 'Due in 4 Days', status: 'In Progress', priority: 'High', startDate: '06 Sep 2026',
    estimatedEndDate: '20 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Sponsor letter draft has been prepared', updatedBy: 'Putra', updatedAgo: '5 hours ago',
  },
  {
    title: 'PMA Establishment', client: 'Maria Gonzalez', pic: 'Rhea', picInitials: 'RH', category: 'Setup PMA', stage: 'Analysis', progress: 10,
    deadline: '23 Sep 2026', deadlineIso: '2026-09-23', deadlineNote: 'Due in 7 Days', status: 'In Progress', priority: 'Medium', startDate: '09 Sep 2026',
    estimatedEndDate: '23 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Shareholder documents have been received', updatedBy: 'Rhea', updatedAgo: '2 hours ago',
  },
  {
    title: 'Property Due Diligence', client: 'PT Nusantara Property', pic: 'Dewa', picInitials: 'DE', category: 'Property', stage: 'Document Check', progress: 55,
    deadline: '28 Sep 2026', deadlineIso: '2026-09-28', deadlineNote: 'Due in 12 Days', status: 'In Progress', priority: 'Medium', startDate: '08 Sep 2026',
    estimatedEndDate: '28 Sep 2026', estimatedDuration: '20 Days', latestUpdate: 'Land certificate validation is in progress', updatedBy: 'Dewa', updatedAgo: '4 hours ago',
  },
  {
    title: 'Company Deed Amendment', client: 'PT Arta Jaya', pic: 'Ayu', picInitials: 'AY', category: 'Legal Document', stage: 'Client Review', progress: 70,
    deadline: '21 Sep 2026', deadlineIso: '2026-09-21', deadlineNote: 'Due in 5 Days', status: 'Obstacle', priority: 'High', startDate: '02 Sep 2026',
    estimatedEndDate: '21 Sep 2026', estimatedDuration: '19 Days', latestUpdate: 'Waiting for confirmation from the client', updatedBy: 'Ayu', updatedAgo: '1 day ago',
  },
  {
    title: 'Trademark Registration', client: 'Bali Creative Studio', pic: 'Putra', picInitials: 'PU', category: 'Legal Document', stage: 'Submission', progress: 80,
    deadline: '25 Sep 2026', deadlineIso: '2026-09-25', deadlineNote: 'Due in 9 Days', status: 'In Progress', priority: 'Low', startDate: '28 Aug 2026',
    estimatedEndDate: '25 Sep 2026', estimatedDuration: '28 Days', latestUpdate: 'Trademark application has been submitted', updatedBy: 'Putra', updatedAgo: '6 hours ago',
  },
  {
    title: 'Investor KITAS Extension', client: 'Sakura Trading', pic: 'Rhea', picInitials: 'RH', category: 'Visa', stage: 'Apply', progress: 60,
    deadline: '17 Sep 2026', deadlineIso: '2026-09-17', deadlineNote: 'Due Tomorrow', status: 'On Hold', priority: 'High', startDate: '27 Aug 2026',
    estimatedEndDate: '17 Sep 2026', estimatedDuration: '21 Days', latestUpdate: 'Awaiting payment confirmation', updatedBy: 'Rhea', updatedAgo: '8 hours ago',
  },
  {
    title: 'Business License Update', client: 'Green Island Ventures', pic: 'Dewa', picInitials: 'DE', category: 'Setup PMA', stage: 'Analysis', progress: 0,
    deadline: '30 Sep 2026', deadlineIso: '2026-09-30', deadlineNote: 'Due in 14 Days', status: 'Not Started', priority: 'Medium', startDate: '16 Sep 2026',
    estimatedEndDate: '30 Sep 2026', estimatedDuration: '14 Days', latestUpdate: 'Job has been assigned and is ready to start', updatedBy: 'Dewa', updatedAgo: '30 minutes ago',
  },
  {
    title: 'Employment Agreement', client: 'PT Merah Putih Digital', pic: 'Ayu', picInitials: 'AY', category: 'Legal Document', stage: 'Completed', progress: 100,
    deadline: '09 Sep 2026', deadlineIso: '2026-09-09', deadlineNote: 'Completed', status: 'Completed', priority: 'Low', startDate: '01 Sep 2026',
    estimatedEndDate: '09 Sep 2026', estimatedDuration: '8 Days', latestUpdate: 'Final agreement was delivered to the client', updatedBy: 'Ayu', updatedAgo: '7 days ago',
  },
  {
    title: 'Tourism Business License', client: 'Oceanic Resort Bali', pic: 'Dalem', picInitials: 'DA', category: 'Setup PMA', stage: 'Document Check', progress: 35,
    deadline: '20 Sep 2026', deadlineIso: '2026-09-20', deadlineNote: 'Due in 4 Days', status: 'Obstacle', priority: 'Medium', startDate: '04 Sep 2026',
    estimatedEndDate: '20 Sep 2026', estimatedDuration: '16 Days', latestUpdate: 'Environmental permit is still incomplete', updatedBy: 'Dalem', updatedAgo: '2 days ago',
  },
  {
    title: 'Land Lease Agreement', client: 'Ubud Living Group', pic: 'Putra', picInitials: 'PU', category: 'Property', stage: 'Drafting', progress: 25,
    deadline: '26 Sep 2026', deadlineIso: '2026-09-26', deadlineNote: 'Due in 10 Days', status: 'In Progress', priority: 'Medium', startDate: '10 Sep 2026',
    estimatedEndDate: '26 Sep 2026', estimatedDuration: '16 Days', latestUpdate: 'Initial agreement draft is being prepared', updatedBy: 'Putra', updatedAgo: '1 hour ago',
  },
];

export const allJobs: AllJob[] = Array.from({ length: 24 }, (_, index) => {
  const template = jobTemplates[index % jobTemplates.length];
  const cycle = Math.floor(index / jobTemplates.length) + 1;

  return {
    ...template,
    id: `job-${index + 1}`,
    title: cycle === 1 ? template.title : `${template.title} - Batch ${cycle}`,
  };
});
