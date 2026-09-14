'use client';

import { createDemoPdf } from '@/lib/admin-demo-pdf';
import { Eye, FileText, ImageIcon, Pencil, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { SopPanelHeader } from './sop-panel-header';

type FlowAsset = {
  name: string;
  type: string;
  blob: Blob;
  displaySize?: string;
  url?: string;
};

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function SopFlowCard({ serviceId }: { serviceId: string }) {
  const [assets, setAssets] = useState<Record<string, FlowAsset>>(() => ({
    'investor-kitas-renewal': {
      name: 'Investor-KITAS-Renewal-Flow.pdf',
      type: 'application/pdf',
      blob: createDemoPdf('Investor KITAS Renewal Flow', ['1. Document verification', '2. Immigration submission', '3. Approval and issuance']),
      displaySize: '4.2 MB',
    },
  }));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const asset = assets[serviceId] ?? null;

  const selectFile = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) return;
    if (asset?.url) URL.revokeObjectURL(asset.url);
    setAssets((current) => ({ ...current, [serviceId]: { name: file.name, type: file.type, blob: file, url: URL.createObjectURL(file) } }));
  };

  const openViewer = () => {
    if (!asset) return;
    const url = asset.url ?? URL.createObjectURL(asset.blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!asset.url) window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <section className="rounded-xl border border-[#C8CDD5] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
      <SopPanelHeader
        icon={Eye}
        title="Flow"
        divider
        action={
          asset ? (
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#E9EBEE] px-2 py-1 text-[10px] font-bold text-[#4B5059]">
                {asset.type === 'application/pdf' ? 'PDF' : 'IMAGE'} · {asset.displaySize ?? formatSize(asset.blob.size)}
              </span>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-8 items-center gap-2 rounded border border-[#D6A6A2] px-3 text-[11px] font-semibold text-[#8C1010] transition hover:bg-[#FFF7F6]">
                Edit <Pencil aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ) : null
        }
      />

      <input ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={(event) => selectFile(event.target.files?.[0])} className="sr-only" />

      {asset ? (
        <button type="button" onClick={openViewer} className="group relative mt-5 block h-[420px] w-full overflow-hidden rounded-lg border border-[#C8CDD5] bg-[#F2F4F7] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/25">
          {asset.type === 'application/pdf' && asset.url ? (
            <iframe title="SOP flow PDF preview" src={`${asset.url}#toolbar=0&navpanes=0&view=FitH`} className="pointer-events-none h-full w-full opacity-35" />
          ) : asset.type === 'application/pdf' ? (
            <span className="absolute inset-8 flex flex-col bg-white px-12 py-10 text-[#273347] opacity-35 shadow-md">
              <span className="text-center text-lg font-semibold">Investor KITAS Renewal Flow</span>
              <span className="mt-10 border-l-4 border-[#8C1010] pl-4 text-sm">1. Document verification</span>
              <span className="mt-8 border-l-4 border-[#C48F18] pl-4 text-sm">2. Immigration submission</span>
              <span className="mt-8 border-l-4 border-[#248454] pl-4 text-sm">3. Approval and issuance</span>
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt="SOP flow preview" className="h-full w-full object-contain opacity-40" />
          )}
          <span className="absolute inset-0 flex flex-col items-center justify-center bg-white/15 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-[#022448] shadow-lg">
              {asset.type === 'application/pdf' ? <FileText aria-hidden="true" className="size-5" /> : <ImageIcon aria-hidden="true" className="size-5" />}
            </span>
            <span className="mt-3 text-sm font-medium text-[#022448]">Klik untuk Memperbesar</span>
            <span className="mt-1 text-[11px] text-[#4D5663]">File akan dibuka pada tab baru.</span>
          </span>
        </button>
      ) : (
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }}
          className="mt-5 flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#B8C0CB] bg-[#F7F8FA] px-6 text-center transition hover:border-[#8C1010] hover:bg-[#FFF9F8]"
        >
          <UploadCloud aria-hidden="true" className="size-9 text-[#8C1010]" strokeWidth={1.6} />
          <span className="mt-3 text-sm font-semibold text-[#2C3441]">Upload PDF atau gambar flow</span>
          <span className="mt-1 text-xs text-[#7B8491]">Klik atau tarik file ke area ini.</span>
          <input type="file" accept="application/pdf,image/*" onChange={(event) => selectFile(event.target.files?.[0])} className="sr-only" />
        </label>
      )}
    </section>
  );
}
