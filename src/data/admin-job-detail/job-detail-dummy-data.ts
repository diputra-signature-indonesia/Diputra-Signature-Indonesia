export type JobStep = {
  id: string;
  label: string;
};

export type JobRemark = {
  id: string;
  message: string;
  assignedTo?: string;
  author: string;
  createdAt: string;
  progressDate: string;
  latest?: boolean;
};

export type JobContributor = {
  id: string;
  name: string;
  initials: string;
  role?: string;
};

export type RelatedClientJob = {
  id: string;
  title: string;
  daysLabel: string;
  urgent?: boolean;
  priority: 'High';
  status: 'On Hold';
};

export const jobDetail = {
  reference: 'JOB-014',
  title: 'Registrasi NPWP',
  client: 'PT Sunji Bakti Inc',
  pic: 'Dalem',
  category: 'Setup PMA',
  priority: 'High',
  startDate: '01 Sep 2026',
  estimatedEndDate: '15 Sep 2026',
  estimatedDuration: '14 days',
  deadline: 'Overdue by 2 days',
  status: 'In Progress',
  description: 'Registration and processing of the client’s company NPWP, including document review, submission, and follow-up.',
  lastUpdated: 'Last updated 3 days ago',
};

export const jobSteps: JobStep[] = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'drafting', label: 'Drafting' },
  { id: 'revision', label: 'Revision' },
  { id: 'finalization', label: 'Finalization' },
  { id: 'issue', label: 'Issue' },
];

export const jobRemarks: JobRemark[] = [
  { id: 'remark-1', message: 'wait for final document from Tax officer', author: 'Dewa', createdAt: '10 Aug 2026', progressDate: '12 May 2023', latest: true },
  { id: 'remark-2', message: 'FU again to KPP Badora via Whatsapp', assignedTo: 'Putra', author: 'Dewa', createdAt: '10 Aug 2026', progressDate: '2 June 2023' },
  { id: 'remark-3', message: 'wait for KPP to issue the removal letter', assignedTo: 'Putra', author: 'Dewa', createdAt: '10 Aug 2026', progressDate: '9 June 2023' },
  { id: 'remark-4', message: 'wait for KPP to issue the removal letter', assignedTo: 'Putra', author: 'Dewa', createdAt: '10 Aug 2026', progressDate: '9 June 2023' },
];

export const jobContributors: JobContributor[] = [
  { id: 'contributor-1', name: 'Dalem', initials: 'D', role: 'PIC' },
  { id: 'contributor-2', name: 'Rahardiputra', initials: 'R', role: 'Admin' },
  { id: 'contributor-3', name: 'Rinjani', initials: 'R' },
  { id: 'contributor-4', name: 'Ayu Lestari', initials: 'AL', role: 'Reviewer' },
  { id: 'contributor-5', name: 'Dewa Putra', initials: 'DP', role: 'Support' },
];

export const relatedClientJobs: RelatedClientJob[] = [
  { id: 'related-1', title: 'Terminated Stay Permit (TSP)', daysLabel: '1 day left', urgent: true, priority: 'High', status: 'On Hold' },
  { id: 'related-2', title: 'KITAS Investor 2 Years', daysLabel: '9 days left', priority: 'High', status: 'On Hold' },
  { id: 'related-3', title: 'Company Deed Amendment', daysLabel: '12 days left', priority: 'High', status: 'On Hold' },
  { id: 'related-4', title: 'Business License Update', daysLabel: '14 days left', priority: 'High', status: 'On Hold' },
  { id: 'related-5', title: 'Investor KITAS Extension', daysLabel: '18 days left', priority: 'High', status: 'On Hold' },
  { id: 'related-6', title: 'Trademark Registration', daysLabel: '21 days left', priority: 'High', status: 'On Hold' },
];
