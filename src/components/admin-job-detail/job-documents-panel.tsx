'use client';

import {
  addJobFolderPermissionAction,
  deleteJobDocumentAction,
  deleteJobFolderPermissionAction,
  ensureJobDriveFolderAction,
  finalizeJobDocumentUploadAction,
  listJobFolderPermissionsAction,
  prepareJobDocumentUploadAction,
  updateJobFolderPermissionAction,
  type JobFolderPermission,
} from '@/app/admin/all-jobs/[jobId]/document-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { JobDocumentsData } from '@/lib/supabase/queries/job-documents';
import { ExternalLink, FileText, FolderOpen, HardDrive, LoaderCircle, LockKeyhole, MailPlus, RefreshCw, ShieldCheck, Trash2, UploadCloud, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { uploadFileToGoogleDrive } from './job-document-upload-client';

export type DemoJobDocument = {
  id: string;
  job_id?: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  web_view_url: string | null;
  uploaded_at: string;
  sync_status: string;
  version?: number;
};

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const roleLabels: Record<string, string> = {
  reader: 'Viewer', commenter: 'Commenter', writer: 'Editor', fileOrganizer: 'Content manager', organizer: 'Manager', owner: 'Owner',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(value));
}

function formatSize(value: number | null) {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function AccessAvatar({ permission }: { permission: JobFolderPermission }) {
  if (permission.photoLink) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={permission.photoLink} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F5E7E7] text-xs font-bold text-[#8C1010]">{permission.displayName.slice(0, 1).toUpperCase() || <UserRound className="size-4" />}</span>;
}

export function JobDocumentsPanel({ data, canManage, demoDocuments, jobId: explicitJobId }: {
  data?: JobDocumentsData;
  canManage: boolean;
  demoDocuments?: DemoJobDocument[];
  jobId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const documents = demoDocuments ?? data?.documents ?? [];
  const folder = data?.folder ?? null;
  const jobId = explicitJobId ?? folder?.job_id ?? documents[0]?.job_id ?? null;
  const connected = folder?.connection_status === 'READY';
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<(typeof documents)[number] | null>(null);
  const [permissions, setPermissions] = useState<JobFolderPermission[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'reader' | 'commenter' | 'writer'>('reader');
  const [removingPermission, setRemovingPermission] = useState<JobFolderPermission | null>(null);

  const loadPermissions = useCallback(async () => {
    if (!canManage || !jobId || !connected) return;
    setAccessLoading(true);
    setAccessError('');
    const result = await listJobFolderPermissionsAction(jobId);
    setAccessLoading(false);
    setAccessLoaded(true);
    if (!result.ok) { setAccessError(result.message); return; }
    setPermissions(result.data.permissions);
  }, [canManage, connected, jobId]);

  useEffect(() => { void loadPermissions(); }, [loadPermissions]);

  async function upload(file?: File) {
    if (!file || !jobId || busy) return;
    if (file.size > MAX_UPLOAD_BYTES) { setError('Ukuran file maksimal 100 MiB.'); return; }
    setBusy(true); setError(''); setMessage(''); setUploadProgress(0);
    try {
      const prepared = await prepareJobDocumentUploadAction({ jobId, fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size });
      if (!prepared.ok) { setError(prepared.message); return; }
      const googleFileId = await uploadFileToGoogleDrive(prepared.data.uploadUrl, file, setUploadProgress);
      const finalized = await finalizeJobDocumentUploadAction({ jobId, googleFileId });
      if (!finalized.ok) { setError(finalized.message); return; }
      setMessage(finalized.message);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload Google Drive gagal.');
    } finally {
      setBusy(false); setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function prepareFolder() {
    if (!jobId) return;
    setError(''); setMessage('');
    startTransition(async () => {
      const result = await ensureJobDriveFolderAction(jobId);
      if (!result.ok) { setError(result.message); return; }
      setMessage(result.message);
      router.refresh();
    });
  }

  function deleteDocument() {
    if (!jobId || !deleting || !deleting.version) return;
    setError(''); setMessage('');
    startTransition(async () => {
      const result = await deleteJobDocumentAction({ jobId, documentId: deleting.id, version: deleting.version! });
      if (!result.ok) { setError(result.message); return; }
      setDeleting(null); setMessage(result.message); router.refresh();
    });
  }

  function addAccess(event: React.FormEvent) {
    event.preventDefault();
    if (!jobId) return;
    setAccessError('');
    startTransition(async () => {
      const result = await addJobFolderPermissionAction({ jobId, email, role });
      if (!result.ok) { setAccessError(result.message); return; }
      setEmail(''); await loadPermissions();
    });
  }

  function changeRole(permission: JobFolderPermission, nextRole: 'reader' | 'commenter' | 'writer') {
    if (!jobId) return;
    setAccessError('');
    startTransition(async () => {
      const result = await updateJobFolderPermissionAction({ jobId, permissionId: permission.id, role: nextRole });
      if (!result.ok) { setAccessError(result.message); return; }
      await loadPermissions();
    });
  }

  function removeAccess() {
    if (!jobId || !removingPermission) return;
    setAccessError('');
    startTransition(async () => {
      const result = await deleteJobFolderPermissionAction({ jobId, permissionId: removingPermission.id });
      if (!result.ok) { setAccessError(result.message); return; }
      setRemovingPermission(null); await loadPermissions();
    });
  }

  return (
    <main className="min-h-[calc(100vh-176px)] bg-[#F8F9FA] px-4 py-5 pb-32 sm:px-5 lg:px-6">
      <div className="mx-auto grid max-w-7xl items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E3E6EA] px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECEC] text-[#8C1010]"><HardDrive className="size-5" /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-[#252C38]">Documents</h2><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${connected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{connected ? 'Shared Drive connected' : 'Folder not prepared'}</span></div>
                <p className="mt-1 text-xs leading-5 text-[#717B89]">File tersimpan di Google Shared Drive dan dibuka melalui akses Google masing-masing pengguna.</p>
                {folder ? <a href={folder.web_view_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C1010] hover:underline"><FolderOpen className="size-3.5" />Open Job folder<ExternalLink className="size-3" /></a> : null}
              </div>
            </div>
            {canManage && jobId ? <div className="flex flex-wrap items-center gap-2">
              {!connected ? <button type="button" disabled={isPending} onClick={prepareFolder} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CBD1D9] px-3 text-xs font-semibold text-[#485466] hover:border-[#8C1010] disabled:opacity-50"><FolderOpen className="size-4" />Prepare Folder</button> : null}
              <button type="button" disabled={busy || isPending} onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white hover:bg-[#730D0D] disabled:cursor-not-allowed disabled:opacity-55">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{uploadProgress === null ? 'Upload Document' : `Uploading ${uploadProgress}%`}</button>
              <input ref={inputRef} type="file" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
            </div> : null}
          </header>

          <div className="space-y-3 p-5 sm:p-6">
            {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p> : null}
            {message ? <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">{message}</p> : null}
            {documents.map((document) => {
              const size = formatSize(document.file_size_bytes);
              const summary = <><div className="flex min-w-0 items-center gap-3"><FileText className="size-5 shrink-0 text-[#022448]" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#282323]">{document.file_name}</p><p className="mt-0.5 truncate text-[11px] text-[#657080]">{document.mime_type || 'Google Drive file'}{size ? ` · ${size}` : ''}</p></div></div><div className="flex shrink-0 items-center gap-4"><div className="hidden text-right sm:block"><p className="text-[10px] text-[#6B7480]">Tanggal Unggah</p><p className="mt-0.5 text-[11px] text-[#685754]">{formatDate(document.uploaded_at)}</p></div>{document.web_view_url ? <ExternalLink className="size-4 text-[#8C1010]" /> : null}</div></>;
              return <article key={document.id} className="flex items-center gap-2 rounded-lg border border-[#C8CDD5] bg-[#F2F4F7] transition hover:border-[#9FA8B5] hover:bg-[#ECEFF3]">
                {document.web_view_url ? <a href={document.web_view_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/20">{summary}</a> : <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3.5">{summary}</div>}
                {canManage && document.version ? <button type="button" disabled={isPending || busy} onClick={() => setDeleting(document)} aria-label={`Delete ${document.file_name}`} className="mr-3 flex size-8 items-center justify-center rounded-lg text-[#8C1010] hover:bg-red-50 disabled:opacity-40"><Trash2 className="size-4" /></button> : null}
              </article>;
            })}
            {!documents.length ? <div onDragOver={(event) => canManage && event.preventDefault()} onDrop={(event) => { if (!canManage) return; event.preventDefault(); void upload(event.dataTransfer.files[0]); }} className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#C8CDD5] bg-[#FAFBFC] px-6 text-center"><UploadCloud className="size-9 text-[#A5ADB8]" /><h3 className="mt-3 text-sm font-semibold text-[#303846]">Belum ada dokumen Job</h3><p className="mt-1 max-w-md text-xs leading-5 text-[#7B8491]">{canManage ? 'Klik Upload Document atau tarik file ke area ini. Ukuran maksimal 100 MiB.' : 'Dokumen akan muncul setelah PIC atau admin mengunggah file.'}</p></div> : null}
          </div>
        </section>

        <aside className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <header className="border-b border-[#E3E6EA] px-5 py-5">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECEC] text-[#8C1010]"><ShieldCheck className="size-5" /></span><div><h2 className="text-lg font-semibold text-[#252C38]">Manage Access</h2><p className="mt-1 text-xs leading-5 text-[#717B89]">Atur siapa yang dapat membuka folder dan seluruh dokumen Job.</p></div></div>{canManage && connected ? <button type="button" disabled={accessLoading || isPending} onClick={() => void loadPermissions()} aria-label="Refresh access" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#657080] hover:bg-gray-100 disabled:opacity-50"><RefreshCw className={`size-4 ${accessLoading ? 'animate-spin' : ''}`} /></button> : null}</div>
          </header>
          <div className="space-y-4 p-5">
            {!canManage ? <div className="rounded-lg bg-[#F6F7F9] p-4 text-xs leading-5 text-[#68717E]"><LockKeyhole className="mb-2 size-5 text-[#8C1010]" />Hanya PIC Job, admin, atau super admin yang dapat melihat dan mengelola akses folder.</div> : !connected ? <div className="rounded-lg border border-dashed border-[#C8CDD5] bg-[#FAFBFC] p-4 text-center"><FolderOpen className="mx-auto size-6 text-[#8C1010]" /><p className="mt-2 text-xs leading-5 text-[#68717E]">Siapkan folder Job terlebih dahulu untuk mengelola akses.</p>{jobId ? <button type="button" disabled={isPending} onClick={prepareFolder} className="mt-3 rounded-lg bg-[#8C1010] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Prepare Folder</button> : null}</div> : <>
              <form onSubmit={addAccess} className="space-y-2"><label htmlFor="drive-access-email" className="text-xs font-semibold text-[#303846]">Add person</label><div className="flex items-center gap-2"><div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#D5DAE1] px-3 focus-within:border-[#8C1010]"><MailPlus className="size-4 shrink-0 text-[#7B8491]" /><input id="drive-access-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></div><select aria-label="Access role" value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="h-10 rounded-lg border border-[#D5DAE1] bg-white px-2 text-xs outline-none focus:border-[#8C1010]"><option value="reader">Viewer</option><option value="commenter">Commenter</option><option value="writer">Editor</option></select></div><button type="submit" disabled={isPending || accessLoading || !email.trim()} className="h-9 w-full rounded-lg bg-[#8C1010] text-xs font-semibold text-white hover:bg-[#730D0D] disabled:opacity-50">Add access</button></form>
              {accessError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{accessError}</p> : null}
              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {accessLoading && !accessLoaded ? <div className="flex items-center justify-center py-10"><LoaderCircle className="size-6 animate-spin text-[#8C1010]" /></div> : null}
                {permissions.map((permission) => <div key={permission.id} className="rounded-lg border border-[#E0E3E7] p-3"><div className="flex items-start gap-3"><AccessAvatar permission={permission} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#2C3441]">{permission.displayName}</p><p className="mt-0.5 truncate text-[10px] text-[#7B8491]">{permission.emailAddress ?? permission.type}</p></div>{permission.canModify ? <button type="button" disabled={isPending} onClick={() => setRemovingPermission(permission)} aria-label={`Remove access for ${permission.displayName}`} className="flex size-7 shrink-0 items-center justify-center rounded text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 className="size-3.5" /></button> : null}</div><div className="mt-2 flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${permission.inherited ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{permission.inherited ? 'Shared Drive member' : 'Direct access'}</span>{permission.canModify ? <select aria-label={`Role for ${permission.displayName}`} value={permission.role} disabled={isPending} onChange={(event) => changeRole(permission, event.target.value as 'reader' | 'commenter' | 'writer')} className="rounded border border-[#D5DAE1] bg-white px-2 py-1 text-[10px]"><option value="reader">Viewer</option><option value="commenter">Commenter</option><option value="writer">Editor</option></select> : <span className="text-[10px] font-semibold text-[#657080]">{roleLabels[permission.role] ?? permission.role}</span>}</div></div>)}
                {accessLoaded && !permissions.length ? <p className="py-8 text-center text-xs text-[#7B8491]">Belum ada akses yang dapat ditampilkan.</p> : null}
              </div>
              <p className="text-[10px] leading-4 text-[#8A94A3]">Akses dari Shared Drive bersifat turunan dan harus diubah melalui pengaturan Shared Drive.</p>
            </>}
          </div>
        </aside>
      </div>

      <AdminModal open={Boolean(deleting)} onClose={() => { if (!isPending) setDeleting(null); }} title="Delete document?" description={deleting ? `${deleting.file_name} akan dipindahkan ke Google Drive Trash.` : undefined} size="sm" footer={<><button type="button" disabled={isPending} onClick={() => setDeleting(null)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending} onClick={deleteDocument} className="inline-flex h-9 items-center gap-2 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}Move to Trash</button></>} />
      <AdminModal open={Boolean(removingPermission)} onClose={() => { if (!isPending) setRemovingPermission(null); }} title="Remove access?" description={removingPermission ? `${removingPermission.displayName} tidak akan lagi memiliki akses langsung ke folder Job ini.` : undefined} size="sm" footer={<><button type="button" disabled={isPending} onClick={() => setRemovingPermission(null)} className="h-9 rounded border border-[#9EACBF] px-5 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending} onClick={removeAccess} className="inline-flex h-9 items-center gap-2 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}Remove Access</button></>} />
      {busy ? <div className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center bg-white/45 backdrop-grayscale-[30%]"><div className="rounded-xl bg-white px-6 py-5 text-center shadow-xl"><LoaderCircle className="mx-auto size-8 animate-spin text-[#8C1010]" /><p className="mt-3 text-sm font-semibold text-[#303846]">Uploading to Google Drive{uploadProgress === null ? '…' : ` ${uploadProgress}%`}</p></div></div> : null}
    </main>
  );
}
