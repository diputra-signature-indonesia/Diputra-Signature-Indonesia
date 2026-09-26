import type { Enums } from '@/types/database.generated';
import type { UserRole } from '@/types/auth-role';

export type BlogStatus = Enums<'blog_status'>;

export type BlogFilters = {
  query: string;
  status: BlogStatus | 'ALL';
  category: string;
  featured: 'ALL' | 'FEATURED' | 'REGULAR';
  view: 'ACTIVE' | 'ARCHIVED';
  page: number;
};

export type ManagedBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  authorName: string;
  readingTimeMinutes: number;
  featuredImage: string | null;
  coverAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  category: string;
  tags: string[];
  status: BlogStatus;
  isFeatured: boolean;
  rejectionReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
  version: number;
};

export type BlogManagementData = {
  actorId: string;
  actorRole: UserRole;
  posts: ManagedBlogPost[];
  total: number;
  pageSize: number;
  categories: string[];
  summary: {
    draft: number;
    pending: number;
    published: number;
    rejected: number;
  };
};

export type BlogEditorInput = {
  title: string;
  excerpt: string;
  contentHtml: string;
  readingTimeMinutes: number;
  featuredImage: string | null;
  coverAlt: string | null;
  category: string;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
};

export type BlogRevision = {
  id: number;
  sourceVersion: number;
  createdAt: string;
  title: string;
  status: string;
};
