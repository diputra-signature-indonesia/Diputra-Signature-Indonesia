'use client';

import { ExternalLink, FileText, Trash2 } from 'lucide-react';

export type DisplayJobDocument = {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  web_view_url: string | null;
  uploaded_at: string;
  version?: number;
};

function formatSize(value: number | null) {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

export function JobDocumentList({
  documents,
  canManage,
  disabled,
  onDelete,
}: {
  documents: DisplayJobDocument[];
  canManage: boolean;
  disabled: boolean;
  onDelete: (document: DisplayJobDocument) => void;
}) {
  return (
    <div className="space-y-3">
      {documents.map((document) => {
        const size = formatSize(document.file_size_bytes);
        const summary = (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-5 shrink-0 text-[#022448]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#282323]">{document.file_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-[#657080]">
                  {document.mime_type || 'Google Drive file'}
                  {size ? ` · ${size}` : ''}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-[10px] text-[#6B7480]">Tanggal Unggah</p>
                <p className="mt-0.5 text-[11px] text-[#685754]">
                  {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(document.uploaded_at))}
                </p>
              </div>
              {document.web_view_url ? <ExternalLink className="size-4 text-[#8C1010]" /> : null}
            </div>
          </>
        );
        return (
          <article key={document.id} className="flex items-center gap-2 rounded-lg border border-[#C8CDD5] bg-[#F2F4F7] transition hover:border-[#9FA8B5] hover:bg-[#ECEFF3]">
            {document.web_view_url ? (
              <a
                href={document.web_view_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg px-4 py-3.5 focus-visible:ring-2 focus-visible:ring-[#8C1010]/20 focus-visible:outline-none"
              >
                {summary}
              </a>
            ) : (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3.5">{summary}</div>
            )}
            {canManage && document.version ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDelete(document)}
                aria-label={`Delete ${document.file_name}`}
                className="mr-3 flex size-8 items-center justify-center rounded-lg text-[#8C1010] hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
