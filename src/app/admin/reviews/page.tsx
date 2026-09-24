import { ReviewManagementWorkspace } from '@/components/admin-reviews/review-management-workspace';
import { getReviewManagementData } from '@/lib/supabase/queries/reviews';
import type { ReviewManagementFilters } from '@/types/admin-review';

type SearchParams = Record<string, string | string[] | undefined>;

function value(params: SearchParams, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] : item;
}

function parseFilters(params: SearchParams): ReviewManagementFilters {
  const reviewStatus = value(params, 'status');
  const featured = value(params, 'featured');
  const requestState = value(params, 'state');
  const page = Number.parseInt(value(params, 'page') ?? '1', 10);
  return {
    tab: value(params, 'tab') === 'links' ? 'links' : 'reviews',
    query: (value(params, 'q') ?? '').slice(0, 160),
    reviewStatus: ['PENDING', 'PUBLISHED', 'REJECTED'].includes(reviewStatus ?? '') ? (reviewStatus as ReviewManagementFilters['reviewStatus']) : 'ALL',
    featured: ['FEATURED', 'REGULAR'].includes(featured ?? '') ? (featured as ReviewManagementFilters['featured']) : 'ALL',
    requestState: ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'].includes(requestState ?? '') ? (requestState as ReviewManagementFilters['requestState']) : 'ALL',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export default async function AdminReviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const data = await getReviewManagementData(filters);
  return <ReviewManagementWorkspace data={data} filters={filters} initialGenerateOpen={value(params, 'generate') === '1'} />;
}
