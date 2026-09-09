'use client';

import { cn } from '@/lib/cn';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type AdminFilterPanelProps = {
  children: ReactNode;
  gridClassName?: string;
  onReset: () => void;
  onSubmit?: () => void;
};

export function AdminFilterPanel({ children, gridClassName, onReset, onSubmit }: AdminFilterPanelProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <section className="border-b border-gray-200 bg-white px-4 py-5 sm:px-5 lg:px-6">
      <div className="mb-5 w-fit border-b border-[#F2C900] pb-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#242424]">
          <SlidersHorizontal aria-hidden="true" className="size-5 text-[#A61919]" strokeWidth={2} />
          Search &amp; Filters
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={cn('grid gap-3 md:grid-cols-2', gridClassName)}>{children}</div>

        <div className="mt-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={onReset}
            className="h-8 min-w-24 rounded border border-[#9EACBF] bg-white px-5 text-[11px] font-semibold text-[#25344A] transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30"
          >
            Reset
          </button>
          <button
            type="submit"
            className="h-8 min-w-24 rounded bg-[#9F1010] px-5 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35"
          >
            Search
          </button>
        </div>
      </form>
    </section>
  );
}

type AdminSelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function AdminSelectField({ label, value, options, onChange }: AdminSelectFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-[#202020]">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-3 pr-9 text-xs text-[#747D8C] outline-none transition focus:border-[#A61919] focus:ring-2 focus:ring-[#A61919]/10"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-[#98A1B0]" />
      </span>
    </label>
  );
}
