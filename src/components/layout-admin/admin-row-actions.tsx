'use client';

import { EllipsisVertical } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';

export type AdminRowAction = { label: string; icon: ReactNode; disabled?: boolean; hint?: string; destructive?: boolean; onSelect: () => void };

export function AdminRowActions({ title, actions }: { title: string; actions: AdminRowAction[] }) {
  const id = useId();
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
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
          const height = actions.length * 44 + 16;
          setPosition({ left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)), top: rect.bottom + height <= window.innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - height) });
        }}
      >
        <EllipsisVertical aria-hidden="true" className="size-4" />
      </button>
      <div
        id={id}
        ref={popover}
        popover="auto"
        role="menu"
        aria-label={`Actions for ${title}`}
        style={position}
        data-no-accordion
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
        {actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            autoFocus={index === 0 && !action.disabled}
            disabled={action.disabled}
            title={action.hint}
            onClick={() => {
              popover.current?.hidePopover();
              action.onSelect();
            }}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-gray-100 focus-visible:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${action.destructive ? 'text-red-700' : 'text-[#202938]'}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}
