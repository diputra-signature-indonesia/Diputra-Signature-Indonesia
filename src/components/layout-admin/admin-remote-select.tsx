'use client';
import { ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { adminSelectLookupId, adminSelectOptions, type AdminSelectOption as Option } from './admin-select-options';
import { useAdminPage } from './use-admin-page';

export function AdminRemoteSelect({
  kind,
  value,
  onChange,
  label,
  placeholder = 'Search...',
  parent,
  initialLabel,
  disabled,
  fixedOptions = [],
  size = 'sm',
  showDropdownIndicator = false,
  appearance = 'field',
  labelSuffix,
}: {
  kind: 'profiles' | 'clients' | 'services' | 'service_filters' | 'internal_categories' | 'internal_category_filters' | 'workflows' | 'job_titles' | 'jobs';
  value: string;
  onChange: (value: string, label: string) => void;
  label: string;
  placeholder?: string;
  parent?: string;
  initialLabel?: string;
  disabled?: boolean;
  fixedOptions?: readonly Option[];
  size?: 'sm' | 'md';
  showDropdownIndicator?: boolean;
  appearance?: 'field' | 'filter';
  labelSuffix?: ReactNode;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Option | null>(null);
  const params = new URLSearchParams({ kind, query, ...(parent ? { parent } : {}) });
  const results = useAdminPage<Option[]>(open ? `/api/admin/lookups?${params}` : null, undefined, 400);
  const lookupId = adminSelectLookupId(value, fixedOptions, selected?.value);
  const resolved = useAdminPage<Option[]>(lookupId ? `/api/admin/lookups?${new URLSearchParams({ kind, id: lookupId })}` : null);
  const selectedLabel =
    fixedOptions.find((item) => item.value === value)?.label ?? (selected?.value === value ? selected.label : (resolved.data?.find((item) => item.value === value)?.label ?? initialLabel ?? ''));
  const options = adminSelectOptions(fixedOptions, results.loading || results.error ? [] : (results.data ?? []), query);
  return (
    <div
      ref={root}
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          root.current?.querySelector('input')?.focus();
          setOpen(false);
        }
      }}
    >
      <label htmlFor={id} className={size === 'md' ? 'mb-1.5 block text-xs font-semibold text-[#303846]' : 'mb-1 block text-[11px] font-semibold text-[#202020]'}>
        {label}
        {labelSuffix ? <> {labelSuffix}</> : null}
      </label>
      <div
        className={`flex rounded-lg border transition focus-within:border-[#8C1010] focus-within:ring-2 focus-within:ring-[#8C1010]/10 ${size === 'md' ? 'h-10' : 'h-9'} ${appearance === 'filter' ? (value ? 'border-[#E4C756] bg-[#FFFBEA]' : 'border-[#DEE2E7] bg-[#F5F6F8]') : size === 'md' ? 'border-[#D6DAE0] bg-white' : 'border-[#DEE2E7] bg-white'} ${disabled ? 'opacity-60' : ''}`}
      >
        <input
          id={id}
          type="text"
          maxLength={160}
          autoComplete="off"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? `${id}-options` : undefined}
          value={open ? query : selectedLabel}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              root.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();
            }
          }}
          className={`h-full min-w-0 flex-1 rounded-lg bg-transparent px-3 outline-none disabled:cursor-not-allowed ${size === 'md' ? 'text-sm' : 'text-xs'} ${appearance === 'filter' ? 'text-[#747D8C] placeholder:text-[#747D8C]' : 'text-[#303846] placeholder:text-[#A0A8B4]'}`}
        />
        {value && !disabled ? (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange('', '');
              setSelected(null);
            }}
            className="px-2 text-gray-500"
          >
            &times;
          </button>
        ) : null}
        {showDropdownIndicator ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Open ${label} choices`}
            aria-expanded={open}
            aria-controls={open ? `${id}-options` : undefined}
            onClick={() => {
              setOpen(!open);
              setQuery('');
            }}
            className="px-3 text-[#8A94A3] disabled:cursor-not-allowed"
          >
            <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>
      {open ? (
        <div id={`${id}-options`} role="listbox" aria-label={label} className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#DEE2E7] bg-white p-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onMouseDown={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                const target = event.currentTarget;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  (target.nextElementSibling as HTMLElement | null)?.focus();
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  (target.previousElementSibling as HTMLElement | null)?.focus();
                }
              }}
              onClick={() => {
                setSelected(option);
                onChange(option.value, option.label);
                setOpen(false);
              }}
              className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-[#FFF0F0] focus:bg-[#FFF0F0]"
            >
              {option.label}
            </button>
          ))}
          {results.loading ? (
            <p role="status" className="p-3 text-xs text-gray-500">
              Searching...
            </p>
          ) : results.error ? (
            <p role="alert" className="p-3 text-xs text-red-700">
              {results.error}
            </p>
          ) : options.length === 0 ? (
            <p className="p-3 text-xs text-gray-500">No matching results.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
