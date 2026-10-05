'use client';

import { Search } from 'lucide-react';
import { useId } from 'react';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  compact?: boolean;
  hideLabel?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function AdminSearchField({ id: providedId, label, value, onChange, placeholder, compact = false, hideLabel = false, disabled = false, autoFocus = false }: Props) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-xs font-semibold text-[#303846]'}>
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A94A3]" />
        <input
          id={id}
          type="search"
          maxLength={160}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full rounded-lg border pr-3 pl-9 text-[#303846] transition outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'h-9 border-[#DEE2E7] bg-[#F5F6F8] text-xs placeholder:text-[#747D8C]' : 'h-10 border-[#D6DAE0] bg-white text-sm placeholder:text-[#A0A8B4]'}`}
        />
      </div>
    </div>
  );
}
