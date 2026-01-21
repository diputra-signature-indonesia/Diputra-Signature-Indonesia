export type ContentItem = {
  id: string;
  title: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string; // ISO date
  publishedAt: string | null;
};
