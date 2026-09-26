'use client';

import { saveSopPriceItemsAction } from '@/app/admin/sop/actions';
import type { SopService } from '@/types/admin-sop';
import { Check, LoaderCircle, Pencil, Plus, TableProperties, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SopPanelHeader } from './sop-panel-header';

type DraftRow = { id: string; itemName: string; amount: string; notes: string };

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function rowsFromService(service: SopService): DraftRow[] {
  return (service.sop?.priceItems ?? []).map((item) => ({ id: item.id, itemName: item.itemName, amount: String(item.amount), notes: item.notes ?? '' }));
}

export function SopRequirementsTable({ service, canManage }: { service: SopService; canManage: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<DraftRow[]>(() => rowsFromService(service));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  function cancel() {
    setRows(rowsFromService(service));
    setEditing(false);
    setError('');
  }

  function save() {
    const items = rows.map((row) => ({ itemName: row.itemName.trim(), amount: Number(row.amount), notes: row.notes.trim() }));
    if (items.some((item) => !item.itemName || !Number.isSafeInteger(item.amount) || item.amount < 0)) {
      setError('Setiap baris memerlukan nama dan nominal IDR berupa angka bulat nol atau lebih.');
      return;
    }
    setError(''); setMessage('');
    startTransition(async () => {
      const result = await saveSopPriceItemsAction({ serviceId: service.id, description: service.sop?.description ?? null, expectedVersion: service.sop?.version ?? null, items });
      if (!result.ok) { setError(result.message); return; }
      setEditing(false); setMessage(result.message); router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="p-5"><SopPanelHeader icon={TableProperties} title="Price list" action={canManage ? editing ? <div className="flex items-center gap-1">
        <button type="button" disabled={pending} onClick={cancel} aria-label="Cancel Price List editing" className="flex size-8 items-center justify-center rounded-lg text-[#6D737E] hover:bg-gray-100 disabled:opacity-50"><X aria-hidden="true" className="size-4" /></button>
        <button type="button" disabled={pending} onClick={save} aria-label="Save Price List" className="inline-flex h-8 items-center gap-2 rounded bg-[#8C1010] px-3 text-[11px] font-semibold text-white hover:bg-[#710D0D] disabled:opacity-50">{pending ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Check aria-hidden="true" className="size-3.5" />}Save</button>
      </div> : <button type="button" onClick={() => { setEditing(true); setError(''); setMessage(''); }} className="inline-flex h-8 items-center gap-2 rounded border border-[#9EACBF] px-4 text-[11px] font-semibold text-[#5B6472] transition hover:bg-gray-50">Edit <Pencil aria-hidden="true" className="size-3.5" /></button> : null} /></div>

      <div className="overflow-x-auto border-t border-[#E4E7EB]">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead className="bg-[#F8F9FA] text-[10px] font-bold uppercase tracking-[0.05em] text-[#536075]"><tr><th className="px-5 py-3.5">Item / Description</th><th className="w-44 px-5 py-3.5">Price (IDR)</th><th className="w-56 px-5 py-3.5">Notes</th>{editing ? <th className="w-20 px-5 py-3.5 text-right">Action</th> : null}</tr></thead>
          <tbody>
            {rows.map((row) => <tr key={row.id} className="border-t border-[#E4E7EB] text-xs text-[#283141]">
              <td className="px-5 py-4">{editing ? <input value={row.itemName} maxLength={240} onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, itemName: event.target.value } : item))} placeholder="Nama item" className="h-9 w-full rounded border border-[#D9DDE3] bg-[#FAFBFC] px-3 outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10" /> : <span className="font-medium text-[#292323]">{row.itemName}</span>}</td>
              <td className="px-5 py-4">{editing ? <input type="number" min="0" step="1" value={row.amount} onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, amount: event.target.value } : item))} placeholder="0" className="h-9 w-full rounded border border-[#D9DDE3] bg-[#FAFBFC] px-3 outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10" /> : idr.format(Number(row.amount))}</td>
              <td className="px-5 py-4">{editing ? <input value={row.notes} maxLength={1000} onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, notes: event.target.value } : item))} placeholder="Catatan opsional" className="h-9 w-full rounded border border-[#D9DDE3] bg-[#FAFBFC] px-3 outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10" /> : row.notes || '—'}</td>
              {editing ? <td className="px-5 py-4 text-right"><button type="button" disabled={pending} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label={`Delete ${row.itemName || 'price item'}`} className="inline-flex size-8 items-center justify-center rounded-lg text-[#8C1010] hover:bg-[#FFF1F0] disabled:opacity-50"><Trash2 aria-hidden="true" className="size-4" /></button></td> : null}
            </tr>)}
            {!rows.length ? <tr><td colSpan={editing ? 4 : 3} className="px-5 py-10 text-center text-sm text-[#7B8491]">Belum ada item Price List.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {editing ? <div className="border-t border-[#E4E7EB] bg-[#FAFBFC] p-4"><button type="button" disabled={pending} onClick={() => setRows((current) => [...current, { id: crypto.randomUUID(), itemName: '', amount: '', notes: '' }])} className="inline-flex h-9 items-center gap-2 rounded border border-dashed border-[#B5BDC8] bg-white px-4 text-xs font-semibold text-[#536075] transition hover:border-[#8C1010] hover:text-[#8C1010] disabled:opacity-50"><Plus aria-hidden="true" className="size-4" />Add Row</button></div> : null}
      {error ? <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
      {message ? <p role="status" className="m-4 rounded-lg bg-green-50 p-3 text-xs text-green-800">{message}</p> : null}
    </section>
  );
}
