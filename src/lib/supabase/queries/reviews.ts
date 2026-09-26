import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ManagedReview, ManagedReviewRequest, ReviewManagementData, ReviewManagementFilters, ReviewRequestState } from '@/types/admin-review';

const PAGE_SIZE = 10;

function safeSearch(value: string) {
  return value
    .trim()
    .slice(0, 160)
    .replace(/[,%()]/g, ' ');
}

function requestState(row: { used_at: string | null; revoked_at: string | null; expires_at: string | null }): ReviewRequestState {
  if (row.used_at) return 'USED';
  if (row.revoked_at) return 'REVOKED';
  if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}

export async function getReviewManagementData(filters: ReviewManagementFilters): Promise<ReviewManagementData> {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const query = safeSearch(filters.query);
  const offset = (filters.page - 1) * PAGE_SIZE;

  let reviewsQuery = supabase.from('reviews').select('id,review_request_id,client_id,job_id,name,email,message,status,is_featured,created_at,moderated_at', { count: 'exact' }).is('archived_at', null);
  if (query) reviewsQuery = reviewsQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,message.ilike.%${query}%`);
  if (filters.reviewStatus !== 'ALL') reviewsQuery = reviewsQuery.eq('status', filters.reviewStatus);
  if (filters.featured === 'FEATURED') reviewsQuery = reviewsQuery.eq('is_featured', true);
  if (filters.featured === 'REGULAR') reviewsQuery = reviewsQuery.eq('is_featured', false);

  let requestsQuery = supabase.from('review_requests').select('id,client_id,job_id,client_name,client_email,expires_at,used_at,revoked_at,created_at', { count: 'exact' }).is('archived_at', null);
  if (query) requestsQuery = requestsQuery.or(`client_name.ilike.%${query}%,client_email.ilike.%${query}%`);
  const now = new Date().toISOString();
  if (filters.requestState === 'ACTIVE') requestsQuery = requestsQuery.is('used_at', null).is('revoked_at', null).gt('expires_at', now);
  if (filters.requestState === 'USED') requestsQuery = requestsQuery.not('used_at', 'is', null);
  if (filters.requestState === 'REVOKED') requestsQuery = requestsQuery.not('revoked_at', 'is', null);
  if (filters.requestState === 'EXPIRED') requestsQuery = requestsQuery.is('used_at', null).is('revoked_at', null).lte('expires_at', now);

  const [reviewsResult, requestsResult, clientsResult, jobsResult, pendingResult, publishedResult, featuredResult, activeLinksResult] = await Promise.all([
    reviewsQuery
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    requestsQuery.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
    supabase.rpc('list_active_clients_for_job'),
    supabase.from('jobs').select('id,client_id,title').is('archived_at', null).order('title'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').is('archived_at', null),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED').is('archived_at', null),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED').eq('is_featured', true).is('archived_at', null),
    supabase.from('review_requests').select('id', { count: 'exact', head: true }).is('used_at', null).is('revoked_at', null).is('archived_at', null).gt('expires_at', now),
  ]);

  const error = [reviewsResult, requestsResult, clientsResult, jobsResult, pendingResult, publishedResult, featuredResult, activeLinksResult].find((result) => result.error)?.error;
  if (error) throw new Error(`Unable to load Client Reviews: ${error.message}`);

  const reviewRequestIds = (reviewsResult.data ?? []).flatMap((review) => (review.review_request_id ? [review.review_request_id] : []));
  const reviewSnapshotsResult = reviewRequestIds.length ? await supabase.from('review_requests').select('id,client_name').in('id', reviewRequestIds) : { data: [], error: null };
  if (reviewSnapshotsResult.error) throw new Error(`Unable to load Review snapshots: ${reviewSnapshotsResult.error.message}`);

  const clientNames = new Map((clientsResult.data ?? []).map((client) => [client.id, client.name]));
  const jobTitles = new Map((jobsResult.data ?? []).map((job) => [job.id, job.title]));
  const reviewSnapshots = new Map((reviewSnapshotsResult.data ?? []).map((request) => [request.id, request.client_name]));
  const reviews: ManagedReview[] = (reviewsResult.data ?? []).map((review) => ({
    id: review.id,
    clientId: review.client_id,
    jobId: review.job_id,
    clientName: review.client_id
      ? (clientNames.get(review.client_id) ?? reviewSnapshots.get(review.review_request_id ?? '') ?? review.name)
      : (reviewSnapshots.get(review.review_request_id ?? '') ?? review.name),
    jobTitle: review.job_id ? (jobTitles.get(review.job_id) ?? null) : null,
    name: review.name,
    email: review.email,
    message: review.message,
    status: review.status,
    isFeatured: Boolean(review.is_featured),
    createdAt: review.created_at,
    moderatedAt: review.moderated_at,
  }));

  const reviewRequests: ManagedReviewRequest[] = (requestsResult.data ?? []).map((request) => ({
    id: request.id,
    clientId: request.client_id,
    jobId: request.job_id,
    clientName: request.client_name ?? 'Legacy Client',
    clientEmail: request.client_email,
    jobTitle: request.job_id ? (jobTitles.get(request.job_id) ?? null) : null,
    state: requestState(request),
    expiresAt: request.expires_at,
    usedAt: request.used_at,
    revokedAt: request.revoked_at,
    createdAt: request.created_at,
  }));

  return {
    actorRole: actor.role,
    reviews,
    reviewRequests,
    reviewTotal: reviewsResult.count ?? 0,
    requestTotal: requestsResult.count ?? 0,
    pageSize: PAGE_SIZE,
    summary: {
      pending: pendingResult.count ?? 0,
      published: publishedResult.count ?? 0,
      featured: featuredResult.count ?? 0,
      activeLinks: activeLinksResult.count ?? 0,
    },
    options: {
      clients: clientsResult.data ?? [],
      jobs: (jobsResult.data ?? []).map((job) => ({ id: job.id, clientId: job.client_id, title: job.title })),
    },
  };
}
