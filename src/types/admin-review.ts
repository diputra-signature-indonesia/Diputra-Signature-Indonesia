import type { UserRole } from '@/types/auth-role';

export type ReviewModerationStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type ReviewRequestState = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export type ReviewManagementFilters = {
  tab: 'reviews' | 'links';
  query: string;
  reviewStatus: 'ALL' | Exclude<ReviewModerationStatus, 'ARCHIVED'>;
  featured: 'ALL' | 'FEATURED' | 'REGULAR';
  requestState: 'ALL' | ReviewRequestState;
  page: number;
};

export type ManagedReview = {
  id: string;
  clientId: string | null;
  jobId: string | null;
  clientName: string | null;
  jobTitle: string | null;
  name: string;
  email: string | null;
  message: string;
  status: ReviewModerationStatus;
  isFeatured: boolean;
  createdAt: string;
  moderatedAt: string | null;
};

export type ManagedReviewRequest = {
  id: string;
  clientId: string | null;
  jobId: string | null;
  clientName: string;
  clientEmail: string | null;
  jobTitle: string | null;
  state: ReviewRequestState;
  expiresAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type ReviewManagementData = {
  actorRole: UserRole;
  reviews: ManagedReview[];
  reviewRequests: ManagedReviewRequest[];
  reviewTotal: number;
  requestTotal: number;
  pageSize: number;
  summary: {
    pending: number;
    published: number;
    featured: number;
    activeLinks: number;
  };
  options: {
    clients: Array<{ id: string; name: string }>;
    jobs: Array<{ id: string; clientId: string; title: string }>;
  };
};
