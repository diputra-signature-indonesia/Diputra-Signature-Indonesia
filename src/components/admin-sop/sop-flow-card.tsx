'use client';

import { uploadSopFile } from '@/components/admin-sop/sop-file-client';
import type { SopService } from '@/types/admin-sop';
import { ExternalLink, Eye, FileText, LoaderCircle, Pencil, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { SopPanelHeader } from './sop-panel-header';

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function SopFlowCard({ service, canManage }: { service: SopService; canManage: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const asset = service.sop?.flow ?? null;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function selectFile(file?: File) {
    if (!file || !canManage || pending) return;
    setPending(true);
    setMessage('');
    setError('');
    const result = await uploadSopFile({ serviceId: service.id, description: service.sop?.description ?? null, fileType: 'FLOW', file, sortOrder: 0 });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(asset ? 'Flow SOP berhasil diganti.' : result.message);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-[#C8CDD5] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
      <SopPanelHeader
        icon={Eye}
        title="Flow"
        divider
        action={asset ? <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded bg-[#E9EBEE] px-2 py-1 text-[10px] font-bold text-[#4B5059]">{asset.mimeType === 'application/pdf' ? 'PDF' : 'IMAGE'} · {formatSize(asset.sizeBytes)}</span>
          {asset.signedUrl ? <a href={asset.driveUrl ?? asset.signedUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-2 rounded border border-[#9EACBF] px-3 text-[11px] font-semibold text-[#536075] transition hover:bg-gray-50 hover:text-[#8C1010]">
            View <ExternalLink aria-hidden="true" className="size-3.5" />
          </a> : null}
          {canManage ? <button type="button" disabled={pending} onClick={() => inputRef.current?.click()} className="inline-flex h-8 items-center gap-2 rounded border border-[#D6A6A2] px-3 text-[11px] font-semibold text-[#8C1010] transition hover:bg-[#FFF7F6] disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Pencil aria-hidden="true" className="size-3.5" />}{pending ? 'Uploading...' : 'Edit'}
          </button> : null}
        </div> : null}
      />

      {canManage ? <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ''; }} className="sr-only" /> : null}

      {asset ? asset.signedUrl ? (
        <div className="mt-5 h-[560px] w-full overflow-hidden rounded-lg border border-[#C8CDD5] bg-[#F2F4F7]">
          {asset.mimeType === 'application/pdf' ? <iframe title={`Preview ${asset.originalFilename}`} src={`${asset.signedUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`} className="h-full w-full bg-white" /> :
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.signedUrl} alt={`Preview ${asset.title}`} className="h-full w-full object-contain" />}
        </div>
      ) : <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[#C8CDD5] bg-[#F7F8FA] px-6 text-center"><FileText aria-hidden="true" className="size-9 text-[#8C1010]" /><p className="mt-3 text-sm font-semibold text-[#2C3441]">Preview file tidak tersedia</p><p className="mt-1 text-xs text-[#7B8491]">Muat ulang halaman untuk membuat tautan file baru.</p></div>
      : canManage ? (
        <button type="button" disabled={pending} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }} className="mt-5 flex min-h-[320px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#B8C0CB] bg-[#F7F8FA] px-6 text-center transition hover:border-[#8C1010] hover:bg-[#FFF9F8] disabled:cursor-wait disabled:opacity-60">
          {pending ? <LoaderCircle aria-hidden="true" className="size-9 animate-spin text-[#8C1010]" /> : <UploadCloud aria-hidden="true" className="size-9 text-[#8C1010]" strokeWidth={1.6} />}<span className="mt-3 text-sm font-semibold text-[#2C3441]">{pending ? 'Mengunggah flow...' : 'Upload PDF atau gambar flow'}</span><span className="mt-1 text-xs text-[#7B8491]">PDF, JPG, PNG, atau WebP. Maksimal 10 MiB.</span>
        </button>
      ) : <div className="mt-5 rounded-lg border border-dashed border-[#C8CDD5] px-5 py-12 text-center text-sm text-[#7B8491]">Belum ada flow untuk SOP ini.</div>}

      {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
      {message ? <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-xs text-green-800">{message}</p> : null}
    </section>
  );
}
