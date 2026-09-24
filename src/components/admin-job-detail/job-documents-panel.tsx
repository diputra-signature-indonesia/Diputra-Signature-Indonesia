import type { JobDocumentsData } from '@/lib/supabase/queries/job-documents';
import { ExternalLink, FileText, FolderOpen, HardDrive, Share2, Trash2, UploadCloud } from 'lucide-react';

export type DemoJobDocument = {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  web_view_url: string | null;
  uploaded_at: string;
  sync_status: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  }).format(new Date(value));
}

function formatSize(value: number | null) {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

export function JobDocumentsPanel({ data, canManage, demoDocuments }: {
  data?: JobDocumentsData;
  canManage: boolean;
  demoDocuments?: DemoJobDocument[];
}) {
  const documents = demoDocuments ?? data?.documents ?? [];
  const folder = data?.folder ?? null;
  const connected = folder?.connection_status === 'READY';

  return (
    <main className="min-h-[calc(100vh-176px)] bg-[#F8F9FA] px-4 py-5 pb-32 sm:px-5 lg:px-6">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E3E6EA] px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECEC] text-[#8C1010]"><HardDrive className="size-5" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-[#252C38]">Documents</h2><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${connected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{connected ? 'Shared Drive connected' : 'Google Drive API pending'}</span></div>
              <p className="mt-1 text-xs leading-5 text-[#717B89]">File Job akan tersimpan di Google Shared Drive. Google Drive tetap menjadi sumber utama file dan hak akses.</p>
              {folder ? <a href={folder.web_view_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C1010] hover:underline"><FolderOpen className="size-3.5" />Open Job folder<ExternalLink className="size-3" /></a> : null}
            </div>
          </div>

          {canManage ? <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled title="Tersedia setelah integrasi Google Drive API" className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-[#CBD1D9] px-3 text-xs font-semibold text-[#6D7785] opacity-60"><Share2 className="size-4" />Manage Access</button>
            <button type="button" disabled title="Tersedia setelah integrasi Google Drive API" className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white opacity-55"><UploadCloud className="size-4" />Upload Document</button>
          </div> : null}
        </header>

        <div className="space-y-3 p-5 sm:p-6">
          {documents.map((document) => {
            const size = formatSize(document.file_size_bytes);
            const summary = <><div className="flex min-w-0 items-center gap-3"><FileText className="size-5 shrink-0 text-[#022448]" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#282323]">{document.file_name}</p><p className="mt-0.5 truncate text-[11px] text-[#657080]">{document.mime_type || 'Google Drive file'}{size ? ` · ${size}` : ''}</p></div></div><div className="flex shrink-0 items-center gap-4"><div className="hidden text-right sm:block"><p className="text-[10px] text-[#6B7480]">Tanggal Unggah</p><p className="mt-0.5 text-[11px] text-[#685754]">{formatDate(document.uploaded_at)}</p></div>{document.web_view_url ? <ExternalLink className="size-4 text-[#8C1010]" /> : null}</div></>;
            return <article key={document.id} className="flex items-center gap-2 rounded-lg border border-[#C8CDD5] bg-[#F2F4F7] transition hover:border-[#9FA8B5] hover:bg-[#ECEFF3]">
              {document.web_view_url ? <a href={document.web_view_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/20">{summary}</a> : <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3.5">{summary}</div>}
              {canManage ? <button type="button" disabled title="Penghapusan Drive tersedia setelah integrasi API" aria-label={`Delete ${document.file_name}`} className="mr-3 flex size-8 cursor-not-allowed items-center justify-center rounded-lg text-[#8C1010] opacity-35"><Trash2 className="size-4" /></button> : null}
            </article>;
          })}

          {!documents.length ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#C8CDD5] bg-[#FAFBFC] px-6 text-center"><UploadCloud className="size-9 text-[#A5ADB8]" /><h3 className="mt-3 text-sm font-semibold text-[#303846]">Belum ada dokumen Job</h3><p className="mt-1 max-w-md text-xs leading-5 text-[#7B8491]">Dokumen akan muncul di sini setelah Job dihubungkan dengan folder Google Shared Drive dan proses upload API diaktifkan.</p></div> : null}
        </div>
      </section>
    </main>
  );
}
