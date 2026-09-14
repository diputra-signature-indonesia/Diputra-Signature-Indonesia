export type SopServiceStatus = 'In Progress' | 'Ready' | 'Draft';

export type SopService = {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: SopServiceStatus;
};

export type SopDocument = {
  id: string;
  name: string;
  uploadedAt: string;
  lines: string[];
  blob?: Blob;
};

export type SopRequirementRow = {
  id: string;
  item: string;
  price: string;
  notes: string;
};

export const initialSopServices: SopService[] = [
  {
    id: 'investor-kitas-renewal',
    title: 'Investor KITAS Renewal',
    summary: 'KITAS extension process for company investors.',
    description: 'This service covers the renewal process of Investor KITAS for foreign shareholders, including document verification and immigration submission.',
    status: 'In Progress',
  },
  {
    id: 'new-pma-registration',
    title: 'New PMA Registration',
    summary: 'Setting up a new foreign-owned company.',
    description: 'End-to-end company registration for foreign investors, from document preparation through business registration.',
    status: 'Ready',
  },
  {
    id: 'sale-purchase-deed',
    title: 'Sale and Purchase Deed',
    summary: 'Legal documentation for property transfer.',
    description: 'Preparation and review of sale and purchase documentation, including supporting ownership and transaction records.',
    status: 'Ready',
  },
  {
    id: 'legal-due-diligence',
    title: 'Legal Due Diligence',
    summary: 'Comprehensive legal audit and reporting.',
    description: 'Structured legal due diligence covering corporate, licensing, contractual, and ownership documentation.',
    status: 'Draft',
  },
  {
    id: 'trademark-registration',
    title: 'Trademark Registration',
    summary: 'Trademark filing and application monitoring.',
    description: 'Trademark availability review, application submission, and registration progress monitoring.',
    status: 'Draft',
  },
  {
    id: 'business-license-update',
    title: 'Business License Update',
    summary: 'Update company licenses and registered activities.',
    description: 'Review and update business classifications, licenses, and supporting company records.',
    status: 'Ready',
  },
];

export const initialSopDocuments: SopDocument[] = [
  { id: 'document-1', name: 'KTP Pemohon.pdf', uploadedAt: '12 Aug 2026', lines: ['Applicant identity document', 'Internal SOP requirement file'] },
  { id: 'document-2', name: 'Passport Pemohon.pdf', uploadedAt: '12 Aug 2026', lines: ['Applicant passport document', 'Internal SOP requirement file'] },
];

export const initialSopRequirements: SopRequirementRow[] = [
  { id: 'requirement-1', item: 'Government Processing Fee', price: 'Rp 2,500,000', notes: 'Paid upfront' },
  { id: 'requirement-2', item: 'Service Fee', price: 'Rp 1,500,000', notes: 'Includes document review' },
  { id: 'requirement-3', item: 'Notary Fee', price: 'Rp 750,000', notes: 'If applicable' },
];
