'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

export function AdminModal({ open, onClose, title, description, children, footer, size = 'md' }: AdminModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`w-full overflow-hidden rounded-2xl border border-[#E0E3E7] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${sizeClasses[size]}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E7E9ED] px-5 py-4">
          <div>
            <h2 id="admin-modal-title" className="text-lg font-semibold text-[#202938]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-5 text-[#707988]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#68717E] transition hover:bg-gray-100 hover:text-[#202938]">
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        {children ? <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div> : null}
        {footer ? <footer className="flex justify-end gap-3 border-t border-[#E7E9ED] bg-[#FAFAFB] px-5 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
}
