'use client';

import { createBlogPostAction, restoreBlogRevisionAction, updateBlogPostAction } from '@/app/admin/blog/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import TiptapEditor from '@/components/layout-admin/tiptap-editor';
import { BLOG_IMAGE_ACCEPT, BLOG_IMAGE_MAX_LABEL } from '@/lib/blog-image-storage';
import { cleanupUnusedImages, deleteImage, extractImageSrcs, publicUrlToPath, uploadCoverImage } from '@/lib/uploadImage';
import type { BlogEditorInput, BlogRevision, ManagedBlogPost } from '@/types/admin-blog';
import { ArrowLeft, Eye, History, ImagePlus, LoaderCircle, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

type UploadedImage = { publicUrl: string; path: string | null };
type EditorState = {
  title: string;
  excerpt: string;
  contentHtml: string;
  category: string;
  tagsText: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
};

const CATEGORY_SUGGESTIONS = ['News', 'Announcement', 'Insight', 'Legal Update', 'Company Update'];
const inputClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#263142] outline-none transition placeholder:text-[#A0A8B3] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10';
const labelClass = 'mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold text-[#303846]';

function readingTime(html: string) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return Math.max(1, Math.ceil((text ? text.split(' ').length : 0) / 200));
}

function contentWordCount(html: string) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

function editorState(post?: ManagedBlogPost): EditorState {
  return {
    title: post?.title ?? '',
    excerpt: post?.excerpt ?? '',
    contentHtml: post?.contentHtml ?? '',
    category: post?.category ?? 'News',
    tagsText: post?.tags.join(', ') ?? '',
    coverAlt: post?.coverAlt ?? '',
    seoTitle: post?.seoTitle ?? '',
    seoDescription: post?.seoDescription ?? '',
  };
}

export function BlogEditorForm({ mode, post, revisions = [], authorName }: { mode: 'create' | 'edit'; post?: ManagedBlogPost; revisions?: BlogRevision[]; authorName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const storageKey = mode === 'create' ? 'blog-v2-create-draft' : `blog-v2-edit-draft:${post?.id}`;
  const initialCover = useMemo<UploadedImage | null>(() => post?.featuredImage ? { publicUrl: post.featuredImage, path: null } : null, [post?.featuredImage]);
  const [form, setForm] = useState<EditorState>(() => editorState(post));
  const [cover, setCover] = useState<UploadedImage | null>(initialCover);
  const [newImagePaths, setNewImagePaths] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<BlogRevision | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const minutes = readingTime(form.contentHtml);
  const words = contentWordCount(form.contentHtml);
  const canSubmitReview = mode === 'create' || post?.status === 'draft' || post?.status === 'rejected';

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { form?: Partial<EditorState>; cover?: UploadedImage | null; newImagePaths?: string[] };
        if (saved.form) setForm((current) => ({ ...current, ...saved.form }));
        if (saved.cover?.publicUrl) setCover(saved.cover);
        if (Array.isArray(saved.newImagePaths)) setNewImagePaths(saved.newImagePaths.filter((item) => typeof item === 'string'));
        setMessage({ tone: 'info', text: 'Draft lokal terakhir dipulihkan dari browser ini.' });
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setDraftReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!draftReady) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({ form, cover, newImagePaths }));
      setLastLocalSave(new Date());
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [cover, draftReady, form, newImagePaths, storageKey]);

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (!dirty || isPending) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, [dirty, isPending]);

  function update<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function pickCover(file: File | undefined) {
    if (!file) return;
    setIsUploading(true);
    setMessage(null);
    try {
      const uploaded = await uploadCoverImage(file);
      if (cover?.path) await deleteImage(cover.path).catch(() => undefined);
      setCover(uploaded);
      setDirty(true);
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Cover gagal diunggah.' });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeCover() {
    if (cover?.path) await deleteImage(cover.path).catch(() => undefined);
    setCover(null);
    setDirty(true);
  }

  function payload(): BlogEditorInput {
    return {
      title: form.title,
      excerpt: form.excerpt,
      contentHtml: form.contentHtml,
      readingTimeMinutes: minutes,
      featuredImage: cover?.publicUrl ?? null,
      coverAlt: form.coverAlt || form.title,
      category: form.category,
      tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
      seoTitle: form.seoTitle || form.title,
      seoDescription: form.seoDescription || form.excerpt,
    };
  }

  function save(submitForReview: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = mode === 'create'
        ? await createBlogPostAction(payload(), submitForReview)
        : await updateBlogPostAction(post!.id, post!.version, payload(), submitForReview);

      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message });
        return;
      }

      try {
        await cleanupUnusedImages(form.contentHtml, newImagePaths);
        if (mode === 'edit' && post?.featuredImage && post.featuredImage !== cover?.publicUrl) {
          const oldCoverPath = publicUrlToPath(post.featuredImage);
          if (oldCoverPath) await deleteImage(oldCoverPath).catch(() => undefined);
        }
        if (mode === 'edit' && post) {
          const oldContentPaths = extractImageSrcs(post.contentHtml).map((url) => publicUrlToPath(url)).filter((path): path is string => Boolean(path));
          const currentPaths = new Set(extractImageSrcs(form.contentHtml).map((url) => publicUrlToPath(url)).filter(Boolean));
          await Promise.all(oldContentPaths.filter((path) => !currentPaths.has(path)).map((path) => deleteImage(path).catch(() => undefined)));
        }
      } finally {
        window.localStorage.removeItem(storageKey);
      }

      setDirty(false);
      router.push('/admin/blog');
      router.refresh();
    });
  }

  function restoreRevision() {
    if (!post || !selectedRevision) return;
    setMessage(null);
    startTransition(async () => {
      const result = await restoreBlogRevisionAction(post.id, selectedRevision.id, post.version);
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message });
        setHistoryOpen(false);
        return;
      }
      window.localStorage.removeItem(storageKey);
      setDirty(false);
      setHistoryOpen(false);
      window.location.reload();
    });
  }

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E4E8] bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/blog" aria-label="Back to Blogpost" className="flex size-9 items-center justify-center rounded-xl border border-[#F2CEC1] text-[#6B4843] hover:bg-[#FFF8F5]"><ArrowLeft className="size-4" /></Link>
          <div className="min-w-0"><h1 className="truncate text-lg font-semibold text-[#202938]">{mode === 'create' ? 'New Article' : 'Edit Article'}</h1><p className="truncate text-xs text-[#7D8692]">{lastLocalSave ? `Saved locally ${lastLocalSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Local autosave ready'} · {words} words · {minutes} min read</p></div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' ? <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#AEB8C6] px-4 text-xs font-semibold text-[#344154] hover:bg-gray-50"><History className="size-4" /> History</button> : null}
          {mode === 'edit' ? <Link href={`/admin/blog/preview/${post!.slug}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#AEB8C6] px-4 text-xs font-semibold text-[#344154] hover:bg-gray-50"><Eye className="size-4" /> Preview</Link> : null}
          <button type="button" disabled={isPending || isUploading} onClick={() => save(false)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#8C1010] px-4 text-xs font-semibold text-[#8C1010] hover:bg-[#FFF7F7] disabled:opacity-50">{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} {mode === 'create' ? 'Save Draft' : 'Save Changes'}</button>
          {canSubmitReview ? <button type="button" disabled={isPending || isUploading} onClick={() => save(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:opacity-50"><Send className="size-4" /> Save &amp; Send</button> : null}
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-5 p-4 pb-24 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {message ? <div role="status" className={`rounded-lg border px-4 py-3 text-xs font-medium ${message.tone === 'error' ? 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]' : 'border-[#BFD3ED] bg-[#F1F6FD] text-[#315A88]'}`}>{message.text}</div> : null}

          <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold">Article Information</h2>
            <div className="mt-5 space-y-4">
              <label className="block"><span className={labelClass}>Title <span className="font-normal text-[#8A94A2]">{form.title.length}/200</span></span><input value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={200} placeholder="Write a clear and informative headline" className={inputClass} /></label>
              <label className="block"><span className={labelClass}>Short Summary <span className="font-normal text-[#8A94A2]">{form.excerpt.length}/500</span></span><textarea value={form.excerpt} onChange={(event) => update('excerpt', event.target.value)} maxLength={500} rows={3} placeholder="A short introduction shown on the blog listing and search results" className="w-full rounded-lg border border-[#D6DAE0] p-3 text-sm outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10" /></label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#E4E7EB] px-5 py-4"><h2 className="text-base font-semibold">Article Content</h2><p className="mt-1 text-xs text-[#7B8592]">Use headings to structure the story and insert images only where they help readers.</p></div>
            {draftReady ? <TiptapEditor initialContent={form.contentHtml} onChange={(value) => update('contentHtml', value)} onImageUploaded={(path) => setNewImagePaths((current) => Array.from(new Set([...current, path])))} /> : <div className="flex min-h-[420px] items-center justify-center"><LoaderCircle className="size-7 animate-spin text-[#8C1010]" /></div>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E7EB] bg-[#FAFBFC] px-5 py-2.5 text-[11px] text-[#7B8592]"><span>{words} words · approximately {minutes} minute{minutes === 1 ? '' : 's'} to read</span><span>Formatting is cleaned automatically when pasted.</span></div>
          </section>

          <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold">Search Preview</h2><p className="mt-1 text-xs text-[#7B8592]">Optional SEO fields fall back to the title and summary.</p>
            <div className="mt-5 grid gap-4">
              <label><span className={labelClass}>SEO Title <span className="font-normal text-[#8A94A2]">{form.seoTitle.length}/70</span></span><input value={form.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} maxLength={70} placeholder={form.title || 'Article title'} className={inputClass} /></label>
              <label><span className={labelClass}>SEO Description <span className="font-normal text-[#8A94A2]">{form.seoDescription.length}/180</span></span><textarea value={form.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} maxLength={180} rows={3} placeholder={form.excerpt || 'Article summary'} className="w-full rounded-lg border border-[#D6DAE0] p-3 text-sm outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10" /></label>
              <div className="rounded-lg border border-[#DDE2E8] bg-[#FAFBFC] p-4"><p className="truncate text-xs text-[#27823B]">diputrasignature.com/blog/{post?.slug ?? 'article-slug-generated-after-save'}</p><p className="mt-1 truncate text-base font-medium text-[#254FA3]">{form.seoTitle || form.title || 'Article title'}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#596473]">{form.seoDescription || form.excerpt || 'Article description will appear here.'}</p></div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold">Publishing</h2>
            <dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><dt className="text-[#7B8592]">Author</dt><dd className="text-right font-semibold">{post?.authorName ?? authorName}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7B8592]">Status</dt><dd className="font-semibold capitalize">{post?.status.replace('_', ' ') ?? 'Draft'}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7B8592]">Reading time</dt><dd className="font-semibold">{minutes} minutes</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7B8592]">Slug</dt><dd className="max-w-44 truncate text-right font-mono text-[10px]">{post?.slug ?? 'generated on save'}</dd></div></dl>
            {post?.rejectionReason ? <div className="mt-4 rounded-lg border border-[#F1B9B9] bg-[#FFF3F3] p-3"><p className="text-xs font-semibold text-[#A51919]">Revision note</p><p className="mt-1 text-xs leading-5 text-[#7F3939]">{post.rejectionReason}</p></div> : null}
          </section>

          <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold">Cover Image</h2><p className="mt-1 text-xs leading-5 text-[#7B8592]">JPEG, PNG, or WebP up to {BLOG_IMAGE_MAX_LABEL}. Recommended 1200 × 750.</p>
            <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-lg border border-dashed border-[#CDD3DB] bg-[#F5F6F8]">
              {cover ? <Image src={cover.publicUrl} alt="Cover preview" fill sizes="340px" className="object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-[#919AA6]"><ImagePlus className="size-7" /><span className="mt-2 text-xs">No cover selected</span></div>}
            </div>
            <input ref={fileRef} type="file" accept={BLOG_IMAGE_ACCEPT} onChange={(event) => pickCover(event.target.files?.[0])} className="hidden" />
            <div className="mt-3 flex gap-2"><button type="button" disabled={isUploading} onClick={() => fileRef.current?.click()} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#8C1010] text-xs font-semibold text-[#8C1010] disabled:opacity-50">{isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {cover ? 'Replace' : 'Upload'}</button><button type="button" disabled={!cover || isUploading} onClick={removeCover} className="flex size-9 items-center justify-center rounded-lg border border-[#D8DCE2] text-[#A51919] disabled:opacity-35"><Trash2 className="size-4" /></button></div>
            <label className="mt-4 block"><span className={labelClass}>Image Alt Text</span><input value={form.coverAlt} onChange={(event) => update('coverAlt', event.target.value)} maxLength={200} placeholder="Describe the image for accessibility" className={inputClass} /></label>
          </section>

          <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold">Organization</h2>
            <div className="mt-4 space-y-4"><label><span className={labelClass}>Category</span><input list="blog-category-suggestions" value={form.category} onChange={(event) => update('category', event.target.value)} maxLength={80} className={inputClass} /><datalist id="blog-category-suggestions">{CATEGORY_SUGGESTIONS.map((item) => <option key={item} value={item} />)}</datalist></label><label><span className={labelClass}>Tags <span className="font-normal text-[#8A94A2]">maximum 10</span></span><input value={form.tagsText} onChange={(event) => update('tagsText', event.target.value)} placeholder="regulation, bali, company" className={inputClass} /><span className="mt-1.5 block text-[10px] text-[#8A94A2]">Separate tags with commas.</span></label></div>
          </section>
        </aside>
      </main>

      {isPending ? <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-white/50 backdrop-grayscale-[30%]"><LoaderCircle className="size-9 animate-spin text-[#8C1010]" /></div> : null}

      <AdminModal open={historyOpen} onClose={() => { setHistoryOpen(false); setSelectedRevision(null); }} title="Article Revision History" description="Restoring a revision creates a new draft. Existing history is retained." size="lg"
        footer={<><button type="button" onClick={() => setHistoryOpen(false)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4E5968]">Cancel</button><button type="button" disabled={!selectedRevision || isPending} onClick={restoreRevision} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white disabled:opacity-40"><RotateCcw className="size-4" /> Restore as Draft</button></>}>
        <div className="space-y-2">
          {revisions.length ? revisions.map((revision) => <button key={revision.id} type="button" onClick={() => setSelectedRevision(revision)} className={`flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition ${selectedRevision?.id === revision.id ? 'border-[#8C1010] bg-[#FFF7F7]' : 'border-[#DDE1E6] hover:border-[#BAC1CA]'}`}><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#273142]">Version {revision.sourceVersion} · {revision.title}</p><p className="mt-1 text-xs capitalize text-[#7B8592]">{revision.status.replace('_', ' ')} · {new Date(revision.createdAt).toLocaleString()}</p></div>{revision.sourceVersion === post?.version ? <span className="rounded-full bg-[#E8F6EC] px-2 py-1 text-[10px] font-semibold text-[#20763B]">Current</span> : null}</button>) : <p className="rounded-lg border border-dashed border-[#D7DCE3] px-4 py-10 text-center text-sm text-[#7B8592]">No revisions are available yet.</p>}
        </div>
      </AdminModal>
    </div>
  );
}
