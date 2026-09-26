'use client';

import { archiveReviewAction, archiveReviewRequestAction, createReviewRequestAction, moderateReviewAction, revokeReviewRequestAction, type CreateReviewRequestInput } from '@/app/admin/reviews/action';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import type { ManagedReview, ManagedReviewRequest, ReviewManagementData, ReviewManagementFilters, ReviewModerationStatus, ReviewRequestState } from '@/types/admin-review';
import { Archive, Ban, Check, ChevronLeft, ChevronRight, Clock3, Copy, Eye, Link2, LoaderCircle, MessageSquareText, Plus, Search, Send, Star } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useMemo, useState, useTransition, type ReactNode } from 'react';

type Notice = { tone: 'success' | 'error'; message: string };
type ConfirmAction = { kind: 'archive-review'; review: ManagedReview } | { kind: 'revoke-request'; request: ManagedReviewRequest } | { kind: 'archive-request'; request: ManagedReviewRequest };

const fieldClass =
  'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-xs text-[#303846] outline-none transition focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:bg-[#F2F3F5]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[#303846]';
const emptyGenerateForm: CreateReviewRequestInput = { clientId: null, clientName: '', clientEmail: '', jobId: null, expiresInDays: 7 };

const reviewStatusStyle: Record<Exclude<ReviewModerationStatus, 'ARCHIVED'>, string> = {
  PENDING: 'border-[#F3D989] bg-[#FFF9E7] text-[#8A6400]',
  PUBLISHED: 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]',
  REJECTED: 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]',
};
const requestStateStyle: Record<ReviewRequestState, string> = {
  ACTIVE: 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]',
  USED: 'border-[#B8C8E5] bg-[#F0F5FF] text-[#245293]',
  EXPIRED: 'border-[#D9DDE3] bg-[#F5F6F8] text-[#667181]',
  REVOKED: 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]',
};

function formatDate(value: string | null, withTime = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Makassar',
  }).format(new Date(value));
}

function readableStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}

export function ReviewManagementWorkspace({ data, filters, initialGenerateOpen }: { data: ReviewManagementData; filters: ReviewManagementFilters; initialGenerateOpen: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState(filters.query);
  const [reviewStatus, setReviewStatus] = useState(filters.reviewStatus);
  const [featured, setFeatured] = useState(filters.featured);
  const [requestState, setRequestState] = useState(filters.requestState);
  const [selectedReview, setSelectedReview] = useState<ManagedReview | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const [generateOpen, setGenerateOpen] = useState(initialGenerateOpen);
  const [clientMode, setClientMode] = useState<'existing' | 'manual'>('existing');
  const [generateForm, setGenerateForm] = useState<CreateReviewRequestInput>(emptyGenerateForm);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const isAdmin = data.actorRole === 'admin' || data.actorRole === 'super_admin';
  const matchingJobs = useMemo(() => data.options.jobs.filter((job) => job.clientId === generateForm.clientId), [data.options.jobs, generateForm.clientId]);
  const total = filters.tab === 'reviews' ? data.reviewTotal : data.requestTotal;
  const totalPages = Math.max(1, Math.ceil(total / data.pageSize));

  function navigate(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === 'ALL') params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => router.push(`${pathname}${params.size ? `?${params}` : ''}`));
  }

  function changeTab(tab: 'reviews' | 'links') {
    setNotice(null);
    navigate({ tab: tab === 'reviews' ? null : 'links', page: null });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({
      q: query.trim() || null,
      status: filters.tab === 'reviews' ? reviewStatus : null,
      featured: filters.tab === 'reviews' ? featured : null,
      state: filters.tab === 'links' ? requestState : null,
      page: null,
    });
  }

  function resetFilters() {
    setQuery('');
    setReviewStatus('ALL');
    setFeatured('ALL');
    setRequestState('ALL');
    navigate({ q: null, status: null, featured: null, state: null, page: null });
  }

  function runMutation(task: () => Promise<{ ok: boolean; message: string }>, success?: () => void) {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await task();
        setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
        if (result.ok) {
          success?.();
          router.refresh();
        }
      } catch {
        setNotice({ tone: 'error', message: 'Koneksi terputus. Silakan coba lagi.' });
      }
    });
  }

  function moderate(status: Exclude<ReviewModerationStatus, 'ARCHIVED'>, isFeatured: boolean) {
    if (!selectedReview) return;
    runMutation(
      () => moderateReviewAction(selectedReview.id, status, isFeatured),
      () => setSelectedReview(null)
    );
  }

  function applyConfirmation() {
    if (!confirmation) return;
    const current = confirmation;
    const action =
      current.kind === 'archive-review'
        ? archiveReviewAction(current.review.id)
        : current.kind === 'revoke-request'
          ? revokeReviewRequestAction(current.request.id)
          : archiveReviewRequestAction(current.request.id);
    runMutation(
      () => action,
      () => setConfirmation(null)
    );
  }

  function openGenerate() {
    setGenerateForm(emptyGenerateForm);
    setClientMode(data.options.clients.length ? 'existing' : 'manual');
    setGeneratedUrl('');
    setCopied(false);
    setGenerateOpen(true);
  }

  function closeGenerate() {
    if (isPending) return;
    setGenerateOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (params.has('generate')) {
      params.delete('generate');
      router.replace(`${pathname}${params.size ? `?${params}` : ''}`);
    }
  }

  function submitGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const input = clientMode === 'existing' ? { ...generateForm, clientName: '' } : { ...generateForm, clientId: null, jobId: null };
    startTransition(async () => {
      const result = await createReviewRequestAction(input);
      if (!result.ok || !result.urlPath) {
        setNotice({ tone: 'error', message: result.message });
        return;
      }
      setGeneratedUrl(`${window.location.origin}${result.urlPath}`);
      setNotice({ tone: 'success', message: result.message });
      router.refresh();
    });
  }

  async function copyGeneratedUrl() {
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="relative min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title="Client Reviews"
        description="Manage client testimonials and one-time review invitations."
        action={
          <button
            type="button"
            onClick={openGenerate}
            className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-4 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 focus-visible:outline-none sm:px-6"
          >
            Generate Link <Plus aria-hidden="true" className="size-3.5" />
          </button>
        }
      />

      <main className="p-4 pb-20 sm:p-5 lg:p-6">
        {notice ? (
          <div
            role="status"
            className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium ${notice.tone === 'success' ? 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]' : 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]'}`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<Clock3 className="size-4" />} label="Awaiting Moderation" value={data.summary.pending} tone="red" />
          <SummaryCard icon={<MessageSquareText className="size-4" />} label="Published" value={data.summary.published} tone="green" />
          <SummaryCard icon={<Star className="size-4" />} label="Featured" value={data.summary.featured} tone="yellow" />
          <SummaryCard icon={<Link2 className="size-4" />} label="Active Links" value={data.summary.activeLinks} tone="blue" />
        </section>

        <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
          <div className="flex border-b border-[#E4E7EB] px-4 sm:px-6">
            <TabButton active={filters.tab === 'reviews'} onClick={() => changeTab('reviews')}>
              Reviews
            </TabButton>
            <TabButton active={filters.tab === 'links'} onClick={() => changeTab('links')}>
              Review Links
            </TabButton>
          </div>

          <form onSubmit={applyFilters} className="grid gap-3 border-b border-[#E4E7EB] bg-[#FCFCFD] p-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8B94A1]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={160}
                placeholder={filters.tab === 'reviews' ? 'Search reviewer, email, or review...' : 'Search client or email...'}
                className={`${fieldClass} pl-9`}
              />
            </div>
            {filters.tab === 'reviews' ? (
              <>
                <select aria-label="Review status" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewManagementFilters['reviewStatus'])} className={fieldClass}>
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <select aria-label="Featured filter" value={featured} onChange={(event) => setFeatured(event.target.value as ReviewManagementFilters['featured'])} className={fieldClass}>
                  <option value="ALL">All Reviews</option>
                  <option value="FEATURED">Featured</option>
                  <option value="REGULAR">Not Featured</option>
                </select>
              </>
            ) : (
              <select
                aria-label="Review link status"
                value={requestState}
                onChange={(event) => setRequestState(event.target.value as ReviewManagementFilters['requestState'])}
                className={`${fieldClass} sm:col-span-2`}
              >
                <option value="ALL">All Link Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="USED">Used</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked</option>
              </select>
            )}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <button type="button" onClick={resetFilters} className="h-10 flex-1 rounded-lg border border-[#B8C1CE] bg-white px-4 text-xs font-semibold text-[#354052] hover:bg-[#F7F8FA]">
                Reset
              </button>
              <button type="submit" className="h-10 flex-1 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C]">
                Search
              </button>
            </div>
          </form>

          {filters.tab === 'reviews' ? (
            <ReviewsTable reviews={data.reviews} onView={setSelectedReview} />
          ) : (
            <ReviewLinksTable requests={data.reviewRequests} isAdmin={isAdmin} onConfirm={setConfirmation} />
          )}

          <footer className="flex flex-col gap-3 border-t border-[#E4E7EB] px-4 py-4 text-xs text-[#667181] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>{total ? `Showing ${(filters.page - 1) * data.pageSize + 1}–${Math.min(filters.page * data.pageSize, total)} of ${total}` : 'No matching data'}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={filters.page <= 1}
                onClick={() => navigate({ page: String(filters.page - 1) })}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9DDE3] bg-white disabled:opacity-35"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-16 text-center">
                {filters.page} / {totalPages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={filters.page >= totalPages}
                onClick={() => navigate({ page: String(filters.page + 1) })}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#D9DDE3] bg-white disabled:opacity-35"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </footer>
        </section>
      </main>

      {isPending ? <LoadingOverlay /> : null}

      <AdminModal
        open={Boolean(selectedReview)}
        onClose={() => !isPending && setSelectedReview(null)}
        title="Review Detail"
        description={selectedReview ? `${selectedReview.name} · ${formatDate(selectedReview.createdAt, true)} WITA` : undefined}
        size="lg"
      >
        {selectedReview ? (
          <div className="space-y-5">
            <div className="grid gap-4 rounded-xl border border-[#E4E7EB] bg-[#FAFAFB] p-4 sm:grid-cols-2">
              <Detail label="Client" value={selectedReview.clientName ?? 'Manual / legacy client'} />
              <Detail label="Job" value={selectedReview.jobTitle ?? 'Not linked'} />
              <Detail label="Reviewer Email" value={selectedReview.email ?? 'Not provided'} />
              <Detail label="Status" value={`${readableStatus(selectedReview.status)}${selectedReview.isFeatured ? ' · Featured' : ''}`} />
            </div>
            <div>
              <p className={labelClass}>Review</p>
              <p className="rounded-xl border border-[#E4E7EB] p-4 text-sm leading-6 whitespace-pre-wrap text-[#303846]">{selectedReview.message}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#E7E9ED] pt-4">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmation({ kind: 'archive-review', review: selectedReview });
                    setSelectedReview(null);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3BABA] px-3 text-xs font-semibold text-[#A51919] hover:bg-[#FFF5F5]"
                >
                  <Archive className="size-4" /> Archive
                </button>
              ) : null}
              {selectedReview.status !== 'REJECTED' ? (
                <button
                  type="button"
                  onClick={() => moderate('REJECTED', false)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9DDE3] px-3 text-xs font-semibold text-[#586273] hover:bg-[#F5F6F8]"
                >
                  <Ban className="size-4" /> Reject
                </button>
              ) : null}
              {selectedReview.status === 'PUBLISHED' ? (
                <button type="button" onClick={() => moderate('PENDING', false)} className="h-9 rounded-lg border border-[#D9DDE3] px-3 text-xs font-semibold text-[#586273] hover:bg-[#F5F6F8]">
                  Unpublish
                </button>
              ) : null}
              {selectedReview.status === 'PUBLISHED' ? (
                <button
                  type="button"
                  onClick={() => moderate('PUBLISHED', !selectedReview.isFeatured)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4C95C] px-3 text-xs font-semibold text-[#7C5D00] hover:bg-[#FFF9E7]"
                >
                  <Star className="size-4" /> {selectedReview.isFeatured ? 'Remove Featured' : 'Make Featured'}
                </button>
              ) : null}
              {selectedReview.status !== 'PUBLISHED' ? (
                <button
                  type="button"
                  onClick={() => moderate('PUBLISHED', false)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C]"
                >
                  <Send className="size-4" /> Publish
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={generateOpen} onClose={closeGenerate} title="Generate Review Link" description="Create a secure one-time link. The raw link is shown only once." size="lg">
        {generatedUrl ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#A7E2BE] bg-[#EDFBF3] p-4">
              <p className="text-sm font-semibold text-[#147A46]">Review link is ready</p>
              <p className="mt-1 text-xs leading-5 text-[#397356]">Copy this link now. For security, the token cannot be recovered after this modal is closed.</p>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#C9EAD6] bg-white p-3">
                <code className="min-w-0 flex-1 text-xs leading-5 break-all text-[#294335]">{generatedUrl}</code>
                <button type="button" onClick={copyGeneratedUrl} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#147A46] px-3 text-[11px] font-semibold text-white">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={closeGenerate} className="h-9 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F1F3F5] p-1">
              <button
                type="button"
                onClick={() => {
                  setClientMode('existing');
                  setGenerateForm(emptyGenerateForm);
                }}
                className={`h-9 rounded-md text-xs font-semibold transition ${clientMode === 'existing' ? 'bg-white text-[#8C1010] shadow-sm' : 'text-[#667181]'}`}
              >
                Existing Client
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientMode('manual');
                  setGenerateForm(emptyGenerateForm);
                }}
                className={`h-9 rounded-md text-xs font-semibold transition ${clientMode === 'manual' ? 'bg-white text-[#8C1010] shadow-sm' : 'text-[#667181]'}`}
              >
                Legacy / Manual
              </button>
            </div>
            {clientMode === 'existing' ? (
              <>
                <div>
                  <label htmlFor="review-client" className={labelClass}>
                    Client <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="review-client"
                    required
                    className={fieldClass}
                    value={generateForm.clientId ?? ''}
                    onChange={(event) => setGenerateForm((current) => ({ ...current, clientId: event.target.value || null, jobId: null }))}
                  >
                    <option value="">Select Client</option>
                    {data.options.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="review-job" className={labelClass}>
                    Job <span className="font-normal text-[#7B8491]">(optional)</span>
                  </label>
                  <select
                    id="review-job"
                    disabled={!generateForm.clientId}
                    className={fieldClass}
                    value={generateForm.jobId ?? ''}
                    onChange={(event) => setGenerateForm((current) => ({ ...current, jobId: event.target.value || null }))}
                  >
                    <option value="">Not linked to a Job</option>
                    {matchingJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="review-client-name" className={labelClass}>
                  Client Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="review-client-name"
                  required
                  maxLength={200}
                  className={fieldClass}
                  value={generateForm.clientName}
                  onChange={(event) => setGenerateForm((current) => ({ ...current, clientName: event.target.value }))}
                  placeholder="Name of legacy client"
                />
              </div>
            )}
            <div>
              <label htmlFor="review-email" className={labelClass}>
                Client Email <span className="font-normal text-[#7B8491]">(optional)</span>
              </label>
              <input
                id="review-email"
                type="email"
                maxLength={254}
                className={fieldClass}
                value={generateForm.clientEmail}
                onChange={(event) => setGenerateForm((current) => ({ ...current, clientEmail: event.target.value }))}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label htmlFor="review-expiry" className={labelClass}>
                Link Validity
              </label>
              <select
                id="review-expiry"
                className={fieldClass}
                value={generateForm.expiresInDays}
                onChange={(event) => setGenerateForm((current) => ({ ...current, expiresInDays: Number(event.target.value) }))}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E7E9ED] pt-4">
              <button type="button" onClick={closeGenerate} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || (clientMode === 'existing' ? !generateForm.clientId : !generateForm.clientName.trim())}
                className="h-9 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]"
              >
                Generate Link
              </button>
            </div>
          </form>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(confirmation)}
        onClose={() => !isPending && setConfirmation(null)}
        title={confirmation?.kind === 'revoke-request' ? 'Revoke Review Link' : 'Archive Data'}
        description="This action keeps historical records but removes the item from the active workspace."
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setConfirmation(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
              Cancel
            </button>
            <button type="button" onClick={applyConfirmation} className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C]">
              Confirm
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-[#586273]">
          {confirmation?.kind === 'revoke-request' ? 'The one-time link will immediately stop working.' : 'The item will no longer appear in this page, while its database history remains intact.'}
        </p>
      </AdminModal>
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'red' | 'green' | 'yellow' | 'blue' }) {
  const styles = { red: 'bg-[#FDECEC] text-[#A51919]', green: 'bg-[#E6F8EE] text-[#14864B]', yellow: 'bg-[#FFF3C2] text-[#8A6500]', blue: 'bg-[#EDF3FF] text-[#245293]' };
  return (
    <article className="rounded-xl border border-[#DDE1E6] bg-white p-4 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2">
        <span className={`inline-flex size-7 items-center justify-center rounded-full ${styles[tone]}`}>{icon}</span>
        <p className="text-[10px] font-semibold tracking-[0.06em] text-[#939CAA] uppercase">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#202938]">{value}</p>
    </article>
  );
}
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`relative px-4 py-4 text-xs font-semibold transition ${active ? 'text-[#8C1010]' : 'text-[#667181] hover:text-[#202938]'}`}>
      {children}
      {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#E7C400]" /> : null}
    </button>
  );
}

function ReviewsTable({ reviews, onView }: { reviews: ManagedReview[]; onView: (review: ManagedReview) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead className="bg-[#F8F9FA] text-[10px] font-semibold tracking-[0.04em] text-[#737B87] uppercase">
          <tr>
            <th className="px-6 py-4">Reviewer / Client</th>
            <th className="px-5 py-4">Review</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Received</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7E9ED]">
          {reviews.map((review) => (
            <tr key={review.id} className="transition hover:bg-[#FCFCFD]">
              <td className="px-6 py-4">
                <p className="text-sm font-semibold text-[#202938]">{review.name}</p>
                <p className="mt-1 text-[11px] text-[#707988]">
                  {review.clientName}
                  {review.jobTitle ? ` · ${review.jobTitle}` : ''}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8B94A1]">{review.email ?? 'No email'}</p>
              </td>
              <td className="max-w-md px-5 py-4">
                <p className="line-clamp-2 text-xs leading-5 text-[#4F5968]">{review.message}</p>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${reviewStatusStyle[review.status as Exclude<ReviewModerationStatus, 'ARCHIVED'>]}`}>
                    {readableStatus(review.status)}
                  </span>
                  {review.isFeatured ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E4C95C] bg-[#FFF9E7] px-2.5 py-1 text-[10px] font-semibold text-[#7C5D00]">
                      <Star className="size-3" /> Featured
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-5 py-4 text-xs text-[#586273]">{formatDate(review.createdAt)}</td>
              <td className="px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onView(review)}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-[#667181] hover:bg-[#F0F2F4] hover:text-[#8C1010]"
                  aria-label={`View review from ${review.name}`}
                >
                  <Eye className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {reviews.length === 0 ? <EmptyState title="No reviews found" description="Try adjusting the search or moderation filters." /> : null}
    </div>
  );
}

function ReviewLinksTable({ requests, isAdmin, onConfirm }: { requests: ManagedReviewRequest[]; isAdmin: boolean; onConfirm: (action: ConfirmAction) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead className="bg-[#F8F9FA] text-[10px] font-semibold tracking-[0.04em] text-[#737B87] uppercase">
          <tr>
            <th className="px-6 py-4">Client</th>
            <th className="px-5 py-4">Job</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Expires</th>
            <th className="px-5 py-4">Created</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7E9ED]">
          {requests.map((request) => (
            <tr key={request.id} className="transition hover:bg-[#FCFCFD]">
              <td className="px-6 py-4">
                <p className="text-sm font-semibold text-[#202938]">{request.clientName}</p>
                <p className="mt-1 text-[11px] text-[#707988]">{request.clientEmail ?? 'No email'}</p>
                {!request.clientId ? <p className="mt-1 text-[10px] font-medium text-[#9F1010]">Legacy / manual client</p> : null}
              </td>
              <td className="px-5 py-4 text-xs text-[#586273]">{request.jobTitle ?? 'Not linked'}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${requestStateStyle[request.state]}`}>{readableStatus(request.state)}</span>
              </td>
              <td className="px-5 py-4 text-xs text-[#586273]">{formatDate(request.expiresAt)}</td>
              <td className="px-5 py-4 text-xs text-[#586273]">{formatDate(request.createdAt)}</td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-1.5">
                  {request.state === 'ACTIVE' ? (
                    <button
                      type="button"
                      onClick={() => onConfirm({ kind: 'revoke-request', request })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E3BABA] px-2.5 text-[10px] font-semibold text-[#A51919] hover:bg-[#FFF5F5]"
                    >
                      <Ban className="size-3.5" /> Revoke
                    </button>
                  ) : null}
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => onConfirm({ kind: 'archive-request', request })}
                      className="inline-flex size-8 items-center justify-center rounded-md text-[#667181] hover:bg-[#F0F2F4]"
                      aria-label={`Archive link for ${request.clientName}`}
                    >
                      <Archive className="size-4" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 ? <EmptyState title="No review links found" description="Generate a new link or adjust the current filters." /> : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.06em] text-[#939CAA] uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#303846]">{value}</p>
    </div>
  );
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-semibold text-[#303846]">{title}</p>
      <p className="mt-1 text-xs text-[#7B8491]">{description}</p>
    </div>
  );
}
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#F3F4F6]/70 backdrop-blur-[1px]">
      <div className="flex items-center gap-2 rounded-xl border border-[#E0E3E7] bg-white px-4 py-3 text-xs font-semibold text-[#586273] shadow-lg">
        <LoaderCircle className="size-5 animate-spin text-[#9F1010]" /> Loading...
      </div>
    </div>
  );
}
