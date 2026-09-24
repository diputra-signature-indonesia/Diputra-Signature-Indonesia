'use client';

import { saveSopDescriptionAction } from '@/app/admin/sop/actions';
import type { SopService } from '@/types/admin-sop';
import { Check, Info, LoaderCircle, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SopPanelHeader } from './sop-panel-header';

export function SopDescriptionCard({ service, canManage }: { service: SopService; canManage: boolean }) {
  const router = useRouter();
  const description = service.sop?.description ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function save() {
    if (pending) return;
    setError(''); setMessage('');
    startTransition(async () => {
      const result = await saveSopDescriptionAction({ serviceId: service.id, description: draft, expectedVersion: service.sop?.version ?? null });
      if (!result.ok) { setError(result.message); return; }
      setEditing(false); setMessage(result.message); router.refresh();
    });
  }

  return <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
    <SopPanelHeader icon={Info} title="Description" action={canManage ? editing ? <div className="flex items-center gap-1">
      <button type="button" disabled={pending} onClick={() => { setDraft(description); setEditing(false); setError(''); }} aria-label="Cancel description editing" className="flex size-8 items-center justify-center rounded-lg text-[#6D737E] hover:bg-gray-100 disabled:opacity-50"><X className="size-4" /></button>
      <button type="button" disabled={pending || draft.length > 10_000} onClick={save} aria-label="Save description" className="flex size-8 items-center justify-center rounded-lg bg-[#8C1010] text-white hover:bg-[#710D0D] disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}</button>
    </div> : <button type="button" onClick={() => { setMessage(''); setError(''); setEditing(true); }} className="inline-flex h-8 items-center gap-2 rounded border border-[#D6A6A2] px-3 text-[11px] font-semibold text-[#8C1010] transition hover:bg-[#FFF7F6]">Edit <Pencil className="size-3.5" /></button> : null} />
    {editing ? <><textarea autoFocus value={draft} maxLength={10_000} onChange={(event) => setDraft(event.target.value)} rows={4} className="mt-4 w-full resize-y rounded-lg border border-[#D9DDE3] bg-[#FAFBFC] px-3 py-2 text-sm leading-6 text-[#302827] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10" /><p className="mt-1 text-right text-[10px] text-[#7B8491]">{draft.length}/10,000</p></> : <p className={`mt-4 text-sm leading-6 sm:text-base ${description ? 'text-[#382F2D]' : 'italic text-[#7B8491]'}`}>{description || 'Belum ada deskripsi SOP untuk service ini.'}</p>}
    {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-xs text-green-800">{message}</p> : null}
  </section>;
}
