'use client';

import type { SopService } from '@/data/admin-sop/sop-dummy-data';
import { Check, Info, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { SopPanelHeader } from './sop-panel-header';

type SopDescriptionCardProps = {
  service: SopService;
  onSave: (description: string) => void;
};

export function SopDescriptionCard({ service, onSave }: SopDescriptionCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(service.description);

  const save = () => {
    const nextDescription = draft.trim();
    if (!nextDescription) return;
    onSave(nextDescription);
    setEditing(false);
  };

  return (
    <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <SopPanelHeader
        icon={Info}
        title="Description"
        badge={<span className="rounded border border-[#E9C400] bg-[#FFF9DC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#705D00]">{service.status}</span>}
        action={
          editing ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { setDraft(service.description); setEditing(false); }} aria-label="Cancel description editing" className="flex size-8 items-center justify-center rounded-lg text-[#6D737E] hover:bg-gray-100">
                <X aria-hidden="true" className="size-4" />
              </button>
              <button type="button" onClick={save} aria-label="Save description" className="flex size-8 items-center justify-center rounded-lg bg-[#8C1010] text-white hover:bg-[#710D0D]">
                <Check aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex h-8 items-center gap-2 rounded border border-[#D6A6A2] px-3 text-[11px] font-semibold text-[#8C1010] transition hover:bg-[#FFF7F6]">
              Edit <Pencil aria-hidden="true" className="size-3.5" />
            </button>
          )
        }
      />

      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          className="mt-4 w-full resize-y rounded-lg border border-[#D9DDE3] bg-[#FAFBFC] px-3 py-2 text-sm leading-6 text-[#302827] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
        />
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#382F2D] sm:text-base">{service.description}</p>
      )}
    </section>
  );
}
