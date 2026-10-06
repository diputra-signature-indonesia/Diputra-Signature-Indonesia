'use client';

import { createJobDocumentGroupAction, deleteJobDocumentGroupAction, loadJobDocumentsPageAction } from '@/app/admin/all-jobs/[jobId]/document-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { JobDocumentGroup, JobDocumentsData } from '@/lib/supabase/queries/job-documents';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FolderOpen, LoaderCircle, Plus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { JobDocumentList, type DisplayJobDocument } from './job-document-list';

function DocumentPagination({ total, page, label, disabled, onPage }: { total: number; page: number; label: string; disabled: boolean; onPage: (page: number) => void }) {
  if (total <= 10) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-[11px] text-[#758094]">
      <span>
        {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Previous ${label} page`} disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg p-2 hover:bg-[#F5F6F8] disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <span className="flex size-7 items-center justify-center rounded bg-[#B74040] font-semibold text-white">{page}</span>
        <button
          type="button"
          aria-label={`Next ${label} page`}
          disabled={disabled || page * 10 >= total}
          onClick={() => onPage(page + 1)}
          className="rounded-lg p-2 hover:bg-[#F5F6F8] disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function JobDocumentBrowser({
  data,
  demoDocuments,
  jobId,
  canManage,
  disabled,
  onUpload,
  onDelete,
  addFolderOpen,
  onCloseAddFolder,
}: {
  data?: JobDocumentsData;
  demoDocuments?: DisplayJobDocument[];
  jobId: string | null;
  canManage: boolean;
  disabled: boolean;
  onUpload: (groupId: string | null, file?: File) => void;
  onDelete: (document: DisplayJobDocument) => void;
  addFolderOpen: boolean;
  onCloseAddFolder: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [pageData, setPageData] = useState(data);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<JobDocumentsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupError, setGroupError] = useState('');
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<JobDocumentGroup | null>(null);
  const [pending, startTransition] = useTransition();
  const pageRequest = useRef(0);
  const groupRequest = useRef(0);
  const blocked = disabled || pending;
  useEffect(() => {
    pageRequest.current += 1;
    setPageData(data);
    setLoading(false);
  }, [data]);
  useEffect(() => {
    setGroupData(null);
    setGroupError('');
    const request = ++groupRequest.current;
    if (!openGroup || !jobId) {
      setGroupLoading(false);
      return;
    }
    setGroupLoading(true);
    void loadJobDocumentsPageAction({ jobId, groupId: openGroup })
      .then((result) => {
        if (groupRequest.current !== request) return;
        if (result.ok) setGroupData(result.data);
        else setGroupError(result.message);
        setGroupLoading(false);
      })
      .catch(() => {
        if (groupRequest.current === request) {
          setGroupError('Dokumen folder gagal dimuat.');
          setGroupLoading(false);
        }
      });
    return () => {
      groupRequest.current += 1;
    };
  }, [openGroup, jobId, data]);
  async function loadPage(page: number, groupsPage: number, groupId: string | null = null) {
    if (!jobId) return;
    const requestRef = groupId ? groupRequest : pageRequest;
    const request = ++requestRef.current;
    if (groupId) {
      setGroupLoading(true);
      setGroupError('');
    } else {
      setLoading(true);
      setError('');
    }
    try {
      const result = await loadJobDocumentsPageAction({ jobId, groupId, page, groupsPage });
      if (requestRef.current !== request) return;
      if (!result.ok) {
        if (groupId) setGroupError(result.message);
        else setError(result.message);
        return;
      }
      if (groupId) setGroupData(result.data);
      else {
        setPageData(result.data);
        setOpenGroup(null);
      }
    } catch {
      if (requestRef.current === request) {
        if (groupId) setGroupError('Dokumen folder gagal dimuat.');
        else setError('Daftar dokumen gagal dimuat.');
      }
    } finally {
      if (requestRef.current === request) {
        if (groupId) setGroupLoading(false);
        else setLoading(false);
      }
    }
  }
  function createFolder(folderName = name) {
    if (!jobId || blocked) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await createJobDocumentGroupAction({ jobId, name: folderName });
        if (!result.ok) setError(result.message);
        else {
          setName('');
          onCloseAddFolder();
        }
      } catch {
        setError('Pembuatan folder belum dapat dikonfirmasi. Muat ulang lalu gunakan Retry.');
      }
      router.refresh();
    });
  }
  function deleteFolder() {
    if (!jobId || !deleting || blocked) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await deleteJobDocumentGroupAction({ jobId, groupId: deleting.id, version: deleting.version });
        if (!result.ok) setError(result.message);
        else {
          setDeleting(null);
          setOpenGroup(null);
        }
      } catch {
        setError('Penghapusan folder belum selesai. Muat ulang lalu gunakan Delete lagi.');
      }
      router.refresh();
    });
  }
  const documents = demoDocuments ?? pageData?.documents ?? [];
  return (
    <div className="space-y-5">
      {error && !addFolderOpen && !deleting ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {pageData?.groupTotal ? (
        <section aria-label="Document folders" className="space-y-3">
          <h3 className="text-xs font-semibold text-[#657080]">Folders</h3>
          {(pageData.groups ?? []).map((group) => {
            const expanded = openGroup === group.id;
            return (
              <article key={group.id} className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white">
                <div className={`flex items-center gap-2 px-3 py-3 sm:px-4 ${expanded ? 'border-b border-[#E3E6EA] bg-[#FAFBFC]' : ''}`}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`${id}-${group.id}`}
                    onClick={() => setOpenGroup(expanded ? null : group.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-[#8C1010]/20 focus-visible:outline-none"
                  >
                    <ChevronDown className={`size-4 shrink-0 text-[#758094] transition-transform ${expanded ? '' : '-rotate-90'}`} />
                    <FolderOpen className="size-4 shrink-0 text-[#8C1010]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#303846]">{group.folder_name}</span>
                      <span className="text-[10px] text-[#8A94A3]">
                        {group.document_count} documents{group.status !== 'READY' ? ` · ${group.status === 'PENDING' ? 'Pending creation' : 'Deletion pending'}` : ''}
                      </span>
                    </span>
                  </button>
                  {group.status === 'READY' ? (
                    <a
                      href={`https://drive.google.com/drive/folders/${encodeURIComponent(group.google_folder_id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${group.folder_name} in Drive`}
                      className="rounded-lg p-2 text-[#758094] hover:bg-[#F2F4F7]"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null}
                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {group.status === 'PENDING' ? (
                        <button
                          type="button"
                          disabled={blocked}
                          onClick={() => createFolder(group.folder_name)}
                          aria-label={`Retry creating ${group.folder_name}`}
                          className="rounded-lg p-2 text-[#8C1010] hover:bg-[#FBECEC] disabled:opacity-40"
                        >
                          <RefreshCw className="size-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={blocked || group.status !== 'READY'}
                        onClick={() => onUpload(group.id)}
                        aria-label={`Add document to ${group.folder_name}`}
                        title="Add document"
                        className="rounded-lg p-2 text-[#8C1010] hover:bg-[#FBECEC] disabled:opacity-40"
                      >
                        <Plus className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => {
                          setError('');
                          setDeleting(group);
                        }}
                        aria-label={`Delete folder ${group.folder_name}`}
                        title="Delete folder"
                        className="rounded-lg p-2 text-[#8C1010] hover:bg-[#FBECEC] disabled:opacity-40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {expanded ? (
                  <div
                    id={`${id}-${group.id}`}
                    className="space-y-3 p-3 sm:p-4"
                    onDragOver={(event) => {
                      if (canManage && group.status === 'READY' && !blocked) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (canManage && group.status === 'READY' && !blocked) onUpload(group.id, event.dataTransfer.files[0]);
                    }}
                  >
                    {groupLoading ? (
                      <p role="status" className="flex items-center justify-center gap-2 py-5 text-xs text-[#758094]">
                        <LoaderCircle className="size-4 animate-spin" />
                        Loading documents...
                      </p>
                    ) : groupError ? (
                      <p role="alert" className="text-xs text-red-700">
                        {groupError}
                        <button type="button" onClick={() => void loadPage(1, pageData.groupPage, group.id)} className="ml-2 underline">
                          Retry
                        </button>
                      </p>
                    ) : (
                      <>
                        <JobDocumentList documents={groupData?.documents ?? []} canManage={canManage && group.status === 'READY'} disabled={blocked} onDelete={onDelete} />
                        {!groupData?.documents.length ? (
                          <p className="rounded-lg border border-dashed border-[#D9DDE3] bg-[#FAFBFC] px-4 py-6 text-center text-xs text-[#7B8491]">
                            {group.status === 'READY' ? 'No documents yet. Add a document to this folder or drop a file here.' : 'Complete the pending folder operation before uploading.'}
                          </p>
                        ) : null}
                        <DocumentPagination
                          total={groupData?.documentTotal ?? 0}
                          page={groupData?.documentPage ?? 1}
                          label="documents"
                          disabled={blocked || groupLoading}
                          onPage={(page) => void loadPage(page, pageData.groupPage, group.id)}
                        />
                      </>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
          <DocumentPagination total={pageData.groupTotal} page={pageData.groupPage} label="folders" disabled={blocked || loading} onPage={(page) => void loadPage(pageData.documentPage, page)} />
        </section>
      ) : null}
      <section aria-label="Ungrouped documents" className="space-y-3">
        {pageData?.groupTotal ? <h3 className="text-xs font-semibold text-[#657080]">Documents without a folder</h3> : null}
        {loading ? (
          <p role="status" className="flex items-center justify-center gap-2 py-5 text-xs text-[#758094]">
            <LoaderCircle className="size-4 animate-spin" />
            Loading documents...
          </p>
        ) : (
          <JobDocumentList documents={documents} canManage={canManage} disabled={blocked} onDelete={onDelete} />
        )}
        {!loading && !documents.length ? (
          <div
            onDragOver={(event) => {
              if (canManage && !blocked) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (canManage && !blocked) onUpload(null, event.dataTransfer.files[0]);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[#C8CDD5] bg-[#FAFBFC] px-6 py-8 text-center ${pageData?.groupTotal ? 'min-h-32' : 'min-h-64'}`}
          >
            <UploadCloud className="size-9 text-[#A5ADB8]" />
            <h3 className="mt-3 text-sm font-semibold text-[#303846]">{pageData?.groupTotal ? 'Belum ada dokumen di luar folder' : 'Belum ada dokumen Job'}</h3>
            <p className="mt-1 max-w-md text-xs leading-5 text-[#7B8491]">
              {canManage ? 'Klik Upload Document atau tarik file ke area ini. Ukuran maksimal 100 MiB.' : 'Dokumen akan muncul setelah PIC atau admin mengunggah file.'}
            </p>
          </div>
        ) : null}
        <DocumentPagination
          total={pageData?.documentTotal ?? documents.length}
          page={pageData?.documentPage ?? 1}
          label="documents"
          disabled={blocked || loading}
          onPage={(page) => void loadPage(page, pageData?.groupPage ?? 1)}
        />
      </section>
      <AdminModal
        open={addFolderOpen}
        onClose={() => {
          if (!pending) {
            setError('');
            onCloseAddFolder();
          }
        }}
        title="Add document folder"
        description="Folder opsional di dalam folder Job. Akses mengikuti folder Job, tanpa pengaturan akses terpisah."
        size="sm"
        footer={
          <>
            <button type="button" disabled={pending} onClick={onCloseAddFolder} className="h-9 rounded-lg border border-[#CBD1D9] px-4 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="button"
              disabled={blocked || !name.trim()}
              onClick={() => createFolder()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}Create folder
            </button>
          </>
        }
      >
        <label htmlFor={`${id}-name`} className="mb-2 block text-xs font-semibold text-[#303846]">
          Folder name
        </label>
        <input
          id={`${id}-name`}
          autoFocus
          maxLength={120}
          value={name}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Company documents"
          className="h-10 w-full rounded-lg border border-[#D6DAE0] bg-[#FAFBFC] px-3 text-sm outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
        />
        {error ? (
          <p role="alert" className="mt-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </AdminModal>
      <AdminModal
        open={Boolean(deleting)}
        onClose={() => {
          if (!pending) {
            setDeleting(null);
            setError('');
          }
        }}
        title="Move folder to Trash?"
        description={deleting?.folder_name}
        size="sm"
        footer={
          <>
            <button type="button" disabled={pending} onClick={() => setDeleting(null)} className="h-9 rounded-lg border border-[#CBD1D9] px-4 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="button"
              disabled={blocked}
              onClick={deleteFolder}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}Move to Trash
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-[#586273]">
          Folder dan seluruh isinya ({deleting?.document_count ?? 0} dokumen terdaftar), termasuk file yang ditambahkan langsung di Drive, akan dipindahkan ke Trash Drive. Dokumen di luar folder ini
          tidak berubah.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </AdminModal>
    </div>
  );
}
