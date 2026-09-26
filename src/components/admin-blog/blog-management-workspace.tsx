'use client';

import {
  archiveBlogPostAction,
  moderateBlogPostAction,
  restoreBlogPostAction,
  setBlogFeaturedAction,
  submitBlogPostAction,
} from '@/app/admin/blog/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import type { BlogFilters, BlogManagementData, BlogStatus, ManagedBlogPost } from '@/types/admin-blog';
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileEdit,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Star,
  Undo2,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useTransition, type ReactNode } from 'react';

type Notice = { tone: 'success' | 'error'; message: string };
type Confirmation =
  | { kind: 'archive'; post: ManagedBlogPost }
  | { kind: 'restore'; post: ManagedBlogPost }
  | { kind: 'unpublish'; post: ManagedBlogPost }
  | { kind: 'reject'; post: ManagedBlogPost };

const statusMeta: Record<BlogStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'border-[#CFD5DD] bg-[#F4F5F7] text-[#5E6875]' },
  pending: { label: 'Waiting Review', className: 'border-[#F0D477] bg-[#FFF8DD] text-[#806000]' },
  published: { label: 'Published', className: 'border-[#A8DFC0] bg-[#EDFAF2] text-[#147545]' },
  rejected: { label: 'Needs Revision', className: 'border-[#F1B9B9] bg-[#FFF0F0] text-[#A51919]' },
};
const fieldClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-xs text-[#303846] outline-none transition focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).format(new Date(value));
}

export function BlogManagementWorkspace({ data, filters }: { data: BlogManagementData; filters: BlogFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState(filters.query);
  const [status, setStatus] = useState(filters.status);
  const [category, setCategory] = useState(filters.category);
  const [featured, setFeatured] = useState(filters.featured);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const isAdmin = data.actorRole === 'admin' || data.actorRole === 'super_admin';
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function navigate(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === 'ALL' || (key === 'view' && value === 'ACTIVE')) params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => router.push(`${pathname}${params.size ? `?${params}` : ''}`));
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    navigate({ q: query.trim() || null, status, category, featured, page: null });
  }

  function resetFilters() {
    setQuery('');
    setStatus('ALL');
    setCategory('ALL');
    setFeatured('ALL');
    navigate({ q: null, status: null, category: null, featured: null, page: null });
  }

  function mutate(task: () => Promise<{ ok: boolean; message: string }>, close = true) {
    setNotice(null);
    setMenuId(null);
    startTransition(async () => {
      try {
        const result = await task();
        setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
        if (result.ok) {
          if (close) setConfirmation(null);
          router.refresh();
        }
      } catch {
        setNotice({ tone: 'error', message: 'Koneksi terputus. Silakan coba lagi.' });
      }
    });
  }

  function confirmAction() {
    if (!confirmation) return;
    const post = confirmation.post;
    if (confirmation.kind === 'archive') mutate(() => archiveBlogPostAction(post.id, post.version));
    if (confirmation.kind === 'restore') mutate(() => restoreBlogPostAction(post.id, post.version));
    if (confirmation.kind === 'unpublish') mutate(() => moderateBlogPostAction(post.id, post.version, 'draft'));
    if (confirmation.kind === 'reject') mutate(() => moderateBlogPostAction(post.id, post.version, 'rejected', rejectionReason));
  }

  return (
    <div className="relative min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader
        title="Blogpost"
        description="Write company news and publish useful updates for website visitors."
        action={
          <Link href="/admin/blog/create" className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-4 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] sm:px-6">
            New Article <Plus aria-hidden="true" className="size-3.5" />
          </Link>
        }
      />

      <main className="p-4 pb-20 sm:p-5 lg:p-6">
        {notice ? <div role="status" className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium ${notice.tone === 'success' ? 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]' : 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]'}`}>{notice.message}</div> : null}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<FileEdit className="size-4" />} label="Draft" value={data.summary.draft} tone="gray" />
          <SummaryCard icon={<Clock3 className="size-4" />} label="Waiting Review" value={data.summary.pending} tone="yellow" />
          <SummaryCard icon={<CheckCircle2 className="size-4" />} label="Published" value={data.summary.published} tone="green" />
          <SummaryCard icon={<Undo2 className="size-4" />} label="Needs Revision" value={data.summary.rejected} tone="red" />
        </section>

        <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#E4E7EB] px-4 sm:px-6">
            <div className="flex">
              <TabButton active={filters.view === 'ACTIVE'} onClick={() => navigate({ view: null, page: null })}>Articles</TabButton>
              {isAdmin ? <TabButton active={filters.view === 'ARCHIVED'} onClick={() => navigate({ view: 'ARCHIVED', page: null })}>Archive</TabButton> : null}
            </div>
            <span className="hidden text-xs text-[#7C8592] sm:block">{data.total} article{data.total === 1 ? '' : 's'}</span>
          </div>

          <form onSubmit={applyFilters} className="grid gap-3 border-b border-[#E4E7EB] bg-[#FCFCFD] p-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-[minmax(260px,1fr)_180px_180px_160px_auto]">
            <label className="relative">
              <span className="sr-only">Search articles</span>
              <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8B94A1]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={160} placeholder="Search title, summary, or author..." className={`${fieldClass} pl-9`} />
            </label>
            <select aria-label="Article status" value={status} onChange={(event) => setStatus(event.target.value as BlogFilters['status'])} className={fieldClass}>
              <option value="ALL">All Statuses</option><option value="draft">Draft</option><option value="pending">Waiting Review</option><option value="published">Published</option><option value="rejected">Needs Revision</option>
            </select>
            <select aria-label="Article category" value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}>
              <option value="ALL">All Categories</option>{data.categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select aria-label="Featured state" value={featured} onChange={(event) => setFeatured(event.target.value as BlogFilters['featured'])} className={fieldClass}>
              <option value="ALL">All Articles</option><option value="FEATURED">Featured</option><option value="REGULAR">Not Featured</option>
            </select>
            <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
              <button type="button" onClick={resetFilters} className="h-10 flex-1 rounded-lg border border-[#9EACBF] px-4 text-xs font-semibold text-[#25344A] hover:bg-gray-50">Reset</button>
              <button type="submit" className="h-10 flex-1 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C]">Search</button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-[#F7F8FA] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#737B86]">
                <tr><th className="px-5 py-3">Article</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Author</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="w-20 px-4 py-3 text-center">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-[#E7E9ED]">
                {data.posts.map((post) => {
                  const canEdit = isAdmin || (post.createdBy === data.actorId && (post.status === 'draft' || post.status === 'rejected'));
                  return (
                    <tr key={post.id} className="align-middle transition hover:bg-[#FCFCFD]">
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-[#E0E3E7] bg-[#F2F3F5]">
                            {post.featuredImage ? <Image src={post.featuredImage} alt="" fill sizes="56px" className="object-cover" /> : <FileText aria-hidden="true" className="absolute inset-0 m-auto size-5 text-[#9CA4AF]" />}
                          </div>
                          <div className="min-w-0"><p className="max-w-[430px] truncate text-sm font-semibold text-[#263142]">{post.title}</p><p className="mt-1 max-w-[430px] truncate text-xs text-[#7A8492]">{post.excerpt}</p>{post.isFeatured ? <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#9A7600]"><Star className="size-3 fill-current" /> Featured</span> : null}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#4A5563]">{post.category}</td>
                      <td className="px-4 py-4 text-xs text-[#4A5563]"><p>{post.authorName}</p><p className="mt-1 text-[10px] text-[#939BA6]">{post.readingTimeMinutes} min read</p></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusMeta[post.status].className}`}>{statusMeta[post.status].label}</span>{post.rejectionReason ? <p className="mt-1 max-w-40 truncate text-[10px] text-[#A51919]" title={post.rejectionReason}>{post.rejectionReason}</p> : null}</td>
                      <td className="px-4 py-4 text-xs text-[#606B79]">{formatDate(post.archivedAt ?? post.updatedAt)}</td>
                      <td className="relative px-4 py-4 text-center">
                        <button type="button" aria-label={`Actions for ${post.title}`} onClick={() => setMenuId(menuId === post.id ? null : post.id)} className="rounded-lg p-2 text-[#68717E] hover:bg-gray-100"><MoreHorizontal className="size-4" /></button>
                        {menuId === post.id ? (
                          <div className="absolute top-12 right-5 z-20 w-52 overflow-hidden rounded-xl border border-[#DDE1E6] bg-white py-1 text-left shadow-xl">
                            <MenuLink href={`/admin/blog/preview/${post.slug}`} icon={<Eye className="size-4" />}>Preview</MenuLink>
                            {canEdit && filters.view === 'ACTIVE' ? <MenuLink href={`/admin/blog/${post.slug}/edit`} icon={<Pencil className="size-4" />}>Edit Article</MenuLink> : null}
                            {filters.view === 'ARCHIVED' && isAdmin ? <MenuButton icon={<RotateCcw className="size-4" />} onClick={() => setConfirmation({ kind: 'restore', post })}>Restore as Draft</MenuButton> : null}
                            {filters.view === 'ACTIVE' && (post.status === 'draft' || post.status === 'rejected') && canEdit ? <MenuButton icon={<Send className="size-4" />} onClick={() => mutate(() => submitBlogPostAction(post.id, post.version))}>Send for Review</MenuButton> : null}
                            {filters.view === 'ACTIVE' && post.status === 'pending' && isAdmin ? <><MenuButton icon={<CheckCircle2 className="size-4" />} onClick={() => mutate(() => moderateBlogPostAction(post.id, post.version, 'published'))}>Publish</MenuButton><MenuButton icon={<XCircle className="size-4" />} onClick={() => { setRejectionReason(''); setConfirmation({ kind: 'reject', post }); }}>Request Revision</MenuButton></> : null}
                            {filters.view === 'ACTIVE' && post.status === 'published' && isAdmin ? <><MenuButton icon={<Star className="size-4" />} onClick={() => mutate(() => setBlogFeaturedAction(post.id, post.version, !post.isFeatured))}>{post.isFeatured ? 'Remove Featured' : 'Mark Featured'}</MenuButton><MenuButton icon={<Undo2 className="size-4" />} onClick={() => setConfirmation({ kind: 'unpublish', post })}>Unpublish to Draft</MenuButton></> : null}
                            {filters.view === 'ACTIVE' && isAdmin ? <MenuButton danger icon={<Archive className="size-4" />} onClick={() => setConfirmation({ kind: 'archive', post })}>Archive</MenuButton> : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!data.posts.length ? <div className="px-6 py-16 text-center"><FileText className="mx-auto size-8 text-[#B4BBC4]" /><p className="mt-3 text-sm font-semibold text-[#45505F]">No articles found</p><p className="mt-1 text-xs text-[#89929F]">Try changing the filters or create a new article.</p></div> : null}
          </div>

          <div className="flex items-center justify-between border-t border-[#E4E7EB] px-5 py-4 text-xs text-[#697381]">
            <span>Page {Math.min(filters.page, totalPages)} of {totalPages}</span>
            <div className="flex items-center gap-2"><button type="button" disabled={filters.page <= 1} onClick={() => navigate({ page: String(filters.page - 1) })} className="rounded-lg border border-[#D7DBE0] p-2 disabled:opacity-35"><ChevronLeft className="size-3.5" /></button><button type="button" disabled={filters.page >= totalPages} onClick={() => navigate({ page: String(filters.page + 1) })} className="rounded-lg border border-[#D7DBE0] p-2 disabled:opacity-35"><ChevronRight className="size-3.5" /></button></div>
          </div>
        </section>
      </main>

      <AdminModal
        open={confirmation !== null}
        onClose={() => !isPending && setConfirmation(null)}
        title={confirmation?.kind === 'reject' ? 'Request Revision' : confirmation?.kind === 'archive' ? 'Archive Article' : confirmation?.kind === 'restore' ? 'Restore Article' : 'Unpublish Article'}
        description={confirmation?.kind === 'reject' ? 'Tell the writer what should be improved.' : confirmation?.kind === 'archive' ? 'The article will disappear from the active list and public website.' : confirmation?.kind === 'restore' ? 'The article will return as an unpublished draft.' : 'The article will no longer be visible on the public website.'}
        footer={<><button type="button" onClick={() => setConfirmation(null)} disabled={isPending} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4F5967] hover:bg-gray-100">Cancel</button><button type="button" onClick={confirmAction} disabled={isPending || (confirmation?.kind === 'reject' && rejectionReason.trim().length < 3)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-45">{isPending ? <LoaderCircle className="size-4 animate-spin" /> : null} Confirm</button></>}
      >
        {confirmation?.kind === 'reject' ? <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#303846]">Revision Notes <span className="text-red-600">*</span></span><textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={500} rows={5} placeholder="Explain what needs to be revised..." className="w-full rounded-lg border border-[#D6DAE0] p-3 text-sm outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10" /></label> : <p className="text-sm text-[#596473]">{confirmation?.post.title}</p>}
      </AdminModal>

      {isPending ? <div className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center bg-white/45 backdrop-grayscale-[30%]"><LoaderCircle className="size-8 animate-spin text-[#8C1010]" /></div> : null}
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'gray' | 'yellow' | 'green' | 'red' }) {
  const toneClass = { gray: 'bg-[#F1F3F5] text-[#66717E]', yellow: 'bg-[#FFF3C4] text-[#997300]', green: 'bg-[#DDF7E7] text-[#16804A]', red: 'bg-[#FFE1E1] text-[#B42121]' }[tone];
  return <div className="rounded-xl border border-[#DCE0E5] bg-white p-4 shadow-[0_2px_4px_rgba(15,23,42,0.04)]"><div className="flex items-center gap-2"><span className={`flex size-7 items-center justify-center rounded-full ${toneClass}`}>{icon}</span><span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#949EAC]">{label}</span></div><p className="mt-2 text-2xl font-semibold text-[#222C3A]">{value}</p></div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`border-b-2 px-4 py-4 text-xs font-semibold transition ${active ? 'border-[#D7B900] text-[#8C1010]' : 'border-transparent text-[#66717E] hover:text-[#202938]'}`}>{children}</button>;
}

function MenuLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return <Link href={href} className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#3F4A58] hover:bg-[#F6F7F9]">{icon}{children}</Link>;
}

function MenuButton({ onClick, icon, danger = false, children }: { onClick: () => void; icon: ReactNode; danger?: boolean; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-[#F6F7F9] ${danger ? 'text-[#B42121]' : 'text-[#3F4A58]'}`}>{icon}{children}</button>;
}
