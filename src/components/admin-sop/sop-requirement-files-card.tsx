'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import { initialSopDocuments, type SopDocument } from '@/data/admin-sop/sop-dummy-data';
import { createDemoPdf } from '@/lib/admin-demo-pdf';
import { createZip, downloadBlob, openBlob } from '@/lib/download-zip';
import { Check, Download, FileText, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { SopPanelHeader } from './sop-panel-header';

function getDocumentBlob(document: SopDocument) {
  return document.blob ?? createDemoPdf(document.name.replace(/\.pdf$/i, ''), document.lines);
}

export function SopRequirementFilesCard() {
  const [documents, setDocuments] = useState<SopDocument[]>(initialSopDocuments);
  const [pendingDelete, setPendingDelete] = useState<SopDocument | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = (files: File[], documentId?: string) => {
    if (!editing || files.length === 0) return;
    const validFiles = files.filter((file) => file.type === 'application/pdf' || (file.type === '' && /\.pdf$/i.test(file.name)));
    setUploadError(validFiles.length !== files.length ? 'Only PDF files can be added to requirements.' : null);
    if (validFiles.length === 0) return;

    const uploadedAt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
    if (documentId) {
      const file = validFiles[0];
      setDocuments((current) => current.map((document) => (document.id === documentId ? { ...document, name: file.name, uploadedAt, blob: file, lines: [] } : document)));
      setReplacementId(null);
    } else {
      const addedDocuments = validFiles.map((file) => ({ id: crypto.randomUUID(), name: file.name, uploadedAt, blob: file, lines: [] }));
      setDocuments((current) => [...current, ...addedDocuments]);
    }
  };

  const downloadAll = async () => {
    if (documents.length === 0) return;
    setDownloading(true);
    try {
      const zip = await createZip(documents.map((document) => ({ name: document.name, blob: getDocumentBlob(document) })));
      downloadBlob(zip, 'sop-requirements.zip');
    } finally {
      setDownloading(false);
    }
  };

  const deleteDocument = () => {
    if (!pendingDelete) return;
    setDocuments((current) => current.filter((document) => document.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <>
      <section className="rounded-xl border border-[#C8CDD5] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
        <SopPanelHeader
          icon={ListChecks}
          title="Requirement"
          divider
          action={
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                aria-label={editing ? 'Done editing requirement files' : 'Edit requirement files'}
                aria-pressed={editing}
                onClick={() => {
                  setEditing((current) => !current);
                  setReplacementId(null);
                  setPendingDelete(null);
                  setUploadError(null);
                }}
                className={`inline-flex h-8 items-center gap-2 rounded px-3 text-[11px] font-semibold transition ${editing ? 'bg-[#8C1010] text-white hover:bg-[#710D0D]' : 'border border-[#9EACBF] text-[#5B6472] hover:bg-gray-50'}`}
              >
                {editing ? 'Done' : 'Edit'}
                {editing ? <Check aria-hidden="true" className="size-3.5" /> : <Pencil aria-hidden="true" className="size-3.5" />}
              </button>
              <button
                type="button"
                disabled={documents.length === 0 || downloading}
                onClick={downloadAll}
                className="inline-flex h-8 min-w-36 items-center justify-center gap-2 rounded bg-[#8C1010] px-5 text-[11px] font-bold text-white transition hover:bg-[#710D0D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download aria-hidden="true" className="size-3.5" />
                {downloading ? 'Preparing ZIP...' : 'Download All'}
              </button>
            </div>
          }
        />

        <input
          ref={addInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          aria-label="Add requirement PDFs"
          onChange={(event) => {
            uploadFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          aria-label="Replace requirement PDF"
          onChange={(event) => {
            if (replacementId) uploadFiles(Array.from(event.target.files ?? []), replacementId);
            event.target.value = '';
          }}
        />

        <div className="mt-5 space-y-3">
          {documents.map((document) => (
            <article key={document.id} className="flex items-center gap-2 rounded-lg border border-[#C8CDD5] bg-[#F2F4F7] transition hover:border-[#9FA8B5] hover:bg-[#ECEFF3]">
              <button
                type="button"
                aria-label={`Open ${document.name} in a new tab`}
                onClick={() => openBlob(getDocumentBlob(document))}
                className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg px-4 py-3.5 text-left focus-visible:ring-2 focus-visible:ring-[#8C1010]/20 focus-visible:outline-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText aria-hidden="true" className="size-5 shrink-0 text-[#022448]" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#5D6672]">Nama File Digital</p>
                    <p className="truncate text-sm font-semibold text-[#282323]">{document.name}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-[10px] text-[#5D6672]">Tanggal Unggah</p>
                    <p className="text-[11px] text-[#685754]">Uploaded {document.uploadedAt}</p>
                  </div>
                </div>
              </button>
              {editing ? (
                <div className="flex shrink-0 items-center gap-1 pr-3">
                  <button
                    type="button"
                    aria-label={`Edit ${document.name}`}
                    title="Replace PDF"
                    onClick={() => {
                      setReplacementId(document.id);
                      setUploadError(null);
                      replaceInputRef.current?.click();
                    }}
                    className="flex size-8 items-center justify-center rounded-lg text-[#536075] transition hover:bg-white hover:text-[#8C1010] focus-visible:ring-2 focus-visible:ring-[#8C1010]/20 focus-visible:outline-none"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${document.name}`}
                    onClick={() => setPendingDelete(document)}
                    className="flex size-8 items-center justify-center rounded-lg text-[#8C1010] transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#8C1010]/20 focus-visible:outline-none"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ) : null}
            </article>
          ))}

          {uploadError ? (
            <p role="alert" className="text-xs text-[#8C1010]">
              {uploadError}
            </p>
          ) : null}

          {editing ? (
            <button
              type="button"
              onClick={() => addInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                uploadFiles(Array.from(event.dataTransfer.files));
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[#B5BDC8] bg-[#FAFBFC] px-4 py-5 text-left transition hover:border-[#8C1010] hover:bg-[#FFF9F8] focus-visible:ring-2 focus-visible:ring-[#8C1010]/20 focus-visible:outline-none"
            >
              <Plus aria-hidden="true" className="size-5 shrink-0 text-[#8C1010]" />
              <span>
                <span className="block text-sm font-semibold text-[#536075]">Add PDF</span>
                <span className="mt-1 block text-[11px] text-[#7B8491]">Click or drag PDF files here.</span>
              </span>
            </button>
          ) : null}

          {documents.length === 0 && !editing ? (
            <div className="rounded-lg border border-dashed border-[#C8CDD5] px-5 py-10 text-center text-sm text-[#7B8491]">No requirement files available.</div>
          ) : null}
        </div>
      </section>

      <AdminModal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete requirement file?"
        description={pendingDelete ? `${pendingDelete.name} will be removed from this SOP.` : undefined}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setPendingDelete(null)} className="h-9 rounded border border-[#9EACBF] bg-white px-5 text-xs font-semibold text-[#25344A] hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={deleteDocument} className="h-9 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C]">
              Delete
            </button>
          </>
        }
      />
    </>
  );
}
