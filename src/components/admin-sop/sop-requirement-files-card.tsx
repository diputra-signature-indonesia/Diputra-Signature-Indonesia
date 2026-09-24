'use client';

import { deleteSopFileAction } from '@/app/admin/sop/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { createZip, downloadBlob } from '@/lib/download-zip';
import type { SopFile, SopService } from '@/types/admin-sop';
import { Check, Download, FileText, ListChecks, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { uploadSopFile } from './sop-file-client';
import { SopPanelHeader } from './sop-panel-header';

function formatDate(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function FileSummary({ document }: { document: SopFile }) {
  return <><div className="flex min-w-0 items-center gap-3"><FileText aria-hidden="true" className="size-5 shrink-0 text-[#022448]" /><div className="min-w-0"><p className="text-[11px] text-[#5D6672]">Nama File Digital</p><p className="truncate text-sm font-semibold text-[#282323]">{document.originalFilename}</p></div></div><div className="hidden shrink-0 text-right sm:block"><p className="text-[10px] text-[#5D6672]">Tanggal Unggah</p><p className="text-[11px] text-[#685754]">Uploaded {formatDate(document.uploadedAt)}</p></div></>;
}

export function SopRequirementFilesCard({ service, canManage }: { service: SopService; canManage: boolean }) {
  const router = useRouter();
  const documents = service.sop?.requirementFiles ?? [];
  const [pendingDelete, setPendingDelete] = useState<SopFile | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [replacement, setReplacement] = useState<SopFile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: File[], replaced?: SopFile) {
    if (!canManage || busy || files.length === 0) return;
    setBusy(true); setError(''); setMessage('');
    const selected = replaced ? files.slice(0, 1) : files;
    let nextOrder = documents.reduce((maximum, document) => Math.max(maximum, document.sortOrder), -1) + 1;
    for (const file of selected) {
      const result = await uploadSopFile({ serviceId: service.id, description: service.sop?.description ?? null, fileType: 'REQUIREMENT', file, sortOrder: replaced?.sortOrder ?? nextOrder });
      if (!result.ok) { setError(result.message); setBusy(false); return; }
      nextOrder += 1;
    }
    if (replaced) {
      const removed = await deleteSopFileAction({ fileId: replaced.id, expectedVersion: replaced.version });
      if (!removed.ok) { setError(`File baru berhasil diunggah, tetapi file lama gagal dihapus: ${removed.message}`); setBusy(false); router.refresh(); return; }
    }
    setReplacement(null);
    setMessage(replaced ? 'File requirement berhasil diganti.' : `${selected.length} file requirement berhasil ditambahkan.`);
    setBusy(false);
    router.refresh();
  }

  async function downloadAll() {
    const available = documents.filter((document) => document.signedUrl);
    if (!available.length || downloading) return;
    setDownloading(true); setError('');
    try {
      const entries = await Promise.all(available.map(async (document) => {
        const response = await fetch(document.signedUrl!);
        if (!response.ok) throw new Error(document.originalFilename);
        return { name: document.originalFilename, blob: await response.blob() };
      }));
      downloadBlob(await createZip(entries), `${service.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-requirements.zip`);
    } catch {
      setError('Sebagian file gagal diunduh. Muat ulang halaman untuk memperbarui tautan file.');
    } finally { setDownloading(false); }
  }

  async function deleteDocument() {
    if (!pendingDelete || busy) return;
    setBusy(true); setError(''); setMessage('');
    const result = await deleteSopFileAction({ fileId: pendingDelete.id, expectedVersion: pendingDelete.version });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setPendingDelete(null); setMessage(result.message); router.refresh();
  }

  return (
    <>
      <section className="rounded-xl border border-[#C8CDD5] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <SopPanelHeader icon={ListChecks} title="Requirement" divider action={<div className="flex flex-wrap justify-end gap-2">
          {canManage ? <button type="button" disabled={busy} aria-pressed={editing} onClick={() => { setEditing((value) => !value); setReplacement(null); setError(''); setMessage(''); }} className={`inline-flex h-8 items-center gap-2 rounded px-3 text-[11px] font-semibold transition disabled:opacity-50 ${editing ? 'bg-[#8C1010] text-white hover:bg-[#710D0D]' : 'border border-[#9EACBF] text-[#5B6472] hover:bg-gray-50'}`}>
            {editing ? <Check aria-hidden="true" className="size-3.5" /> : <Pencil aria-hidden="true" className="size-3.5" />}{editing ? 'Done' : 'Edit'}
          </button> : null}
          <button type="button" disabled={!documents.some((document) => document.signedUrl) || downloading} onClick={() => void downloadAll()} className="inline-flex h-8 min-w-36 items-center justify-center gap-2 rounded bg-[#8C1010] px-5 text-[11px] font-bold text-white transition hover:bg-[#710D0D] disabled:cursor-not-allowed disabled:opacity-50">
            {downloading ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Download aria-hidden="true" className="size-3.5" />}{downloading ? 'Preparing ZIP...' : 'Download All'}
          </button>
        </div>} />

        <input ref={addInputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(event) => { void uploadFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <input ref={replaceInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => { if (replacement) void uploadFiles(Array.from(event.target.files ?? []), replacement); event.target.value = ''; }} />

        <div className="mt-5 space-y-3">
          {documents.map((document) => <article key={document.id} className="flex items-center gap-2 rounded-lg border border-[#C8CDD5] bg-[#F2F4F7] transition hover:border-[#9FA8B5] hover:bg-[#ECEFF3]">
            {document.signedUrl ? <a href={document.signedUrl} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/20"><FileSummary document={document} /></a> : <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3.5"><FileSummary document={document} /></div>}
            {editing ? <div className="flex shrink-0 items-center gap-1 pr-3"><button type="button" disabled={busy} aria-label={`Replace ${document.originalFilename}`} onClick={() => { setReplacement(document); replaceInputRef.current?.click(); }} className="flex size-8 items-center justify-center rounded-lg text-[#536075] hover:bg-white hover:text-[#8C1010] disabled:opacity-50"><Pencil aria-hidden="true" className="size-4" /></button><button type="button" disabled={busy} aria-label={`Delete ${document.originalFilename}`} onClick={() => setPendingDelete(document)} className="flex size-8 items-center justify-center rounded-lg text-[#8C1010] hover:bg-white disabled:opacity-50"><Trash2 aria-hidden="true" className="size-4" /></button></div> : null}
          </article>)}

          {editing ? <button type="button" disabled={busy} onClick={() => addInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFiles(Array.from(event.dataTransfer.files)); }} className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[#B5BDC8] bg-[#FAFBFC] px-4 py-5 text-left transition hover:border-[#8C1010] hover:bg-[#FFF9F8] disabled:cursor-wait disabled:opacity-60">
            {busy ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[#8C1010]" /> : <Plus aria-hidden="true" className="size-5 text-[#8C1010]" />}<span><span className="block text-sm font-semibold text-[#536075]">{busy ? 'Uploading...' : 'Add PDF'}</span><span className="mt-1 block text-[11px] text-[#7B8491]">PDF maksimal 10 MiB per file.</span></span>
          </button> : null}
          {!documents.length && !editing ? <div className="rounded-lg border border-dashed border-[#C8CDD5] px-5 py-10 text-center text-sm text-[#7B8491]">Belum ada file requirement.</div> : null}
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
          {message ? <p role="status" className="rounded-lg bg-green-50 p-3 text-xs text-green-800">{message}</p> : null}
        </div>
      </section>

      <AdminModal open={Boolean(pendingDelete)} onClose={() => { if (!busy) setPendingDelete(null); }} title="Delete requirement file?" description={pendingDelete ? `${pendingDelete.originalFilename} akan dihapus dari SOP.` : undefined} size="sm" footer={<><button type="button" disabled={busy} onClick={() => setPendingDelete(null)} className="h-9 rounded border border-[#9EACBF] bg-white px-5 text-xs font-semibold text-[#25344A] hover:bg-gray-50 disabled:opacity-50">Cancel</button><button type="button" disabled={busy} onClick={() => void deleteDocument()} className="inline-flex h-9 items-center gap-2 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:opacity-50">{busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}Delete</button></>} />
    </>
  );
}
