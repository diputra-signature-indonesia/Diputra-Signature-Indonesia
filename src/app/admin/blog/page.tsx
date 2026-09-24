import { BlogManagementWorkspace } from '@/components/admin-blog/blog-management-workspace';
import { getBlogManagementData } from '@/lib/supabase/queries/blog';
import type { BlogFilters } from '@/types/admin-blog';

type SearchParams = Record<string, string | string[] | undefined>;

function value(params: SearchParams, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] : item;
}

function parseFilters(params: SearchParams): BlogFilters {
  const status = value(params, 'status');
  const featured = value(params, 'featured');
  const page = Number.parseInt(value(params, 'page') ?? '1', 10);
  return {
    query: (value(params, 'q') ?? '').slice(0, 160),
    status: ['draft', 'pending', 'published', 'rejected'].includes(status ?? '') ? (status as BlogFilters['status']) : 'ALL',
    category: (value(params, 'category') ?? 'ALL').slice(0, 80),
    featured: ['FEATURED', 'REGULAR'].includes(featured ?? '') ? (featured as BlogFilters['featured']) : 'ALL',
    view: value(params, 'view') === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const data = await getBlogManagementData(filters);
  return <BlogManagementWorkspace data={data} filters={filters} />;
}
