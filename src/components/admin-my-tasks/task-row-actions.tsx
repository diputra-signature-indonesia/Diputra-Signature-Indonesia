'use client';

import { EllipsisVertical, Eye, ListChecks } from 'lucide-react';
import { useId, useRef, useState } from 'react';

export type MyTaskAction = 'detail' | 'status';

export function TaskRowActions({ title, canChangeStatus, onAction }: { title: string; canChangeStatus: boolean; onAction: (action: MyTaskAction) => void }) {
  const id = useId();
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const select = (action: MyTaskAction) => {
    popover.current?.hidePopover();
    onAction(action);
  };
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-haspopup="menu"
        aria-label={`Actions for ${title}`}
        className="inline-flex rounded-md p-1.5 text-[#8C716D] transition hover:bg-gray-100 hover:text-[#202938]"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({ left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)), top: rect.bottom + 104 <= window.innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - 104) });
        }}
      >
        <EllipsisVertical aria-hidden="true" className="size-4" />
      </button>
      {/* Native popovers escape the table's overflow container and support light-dismiss/Escape. */}
      <div
        id={id}
        ref={popover}
        popover="auto"
        role="menu"
        aria-label={`Task actions for ${title}`}
        style={position}
        className="fixed inset-auto m-0 w-48 rounded-lg border border-[#DEE2E7] bg-white p-1.5 text-left shadow-xl"
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }}
      >
        <button
          type="button"
          role="menuitem"
          autoFocus
          onClick={() => select('detail')}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-[#202938] hover:bg-gray-100 focus-visible:bg-gray-100"
        >
          <Eye aria-hidden="true" className="size-4" /> View Detail
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={!canChangeStatus}
          onClick={() => select('status')}
          title={!canChangeStatus ? 'Job sudah selesai atau Anda tidak memiliki izin mengubah Task.' : undefined}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-[#202938] hover:bg-gray-100 focus-visible:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ListChecks aria-hidden="true" className="size-4" /> Change Status
        </button>
      </div>
    </>
  );
}
