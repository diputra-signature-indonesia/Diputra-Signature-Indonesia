'use client';
import { useId, useRef, useState } from 'react';
import { useAdminPage } from './use-admin-page';

type Option = { value: string; label: string };
export function AdminRemoteSelect({
  kind,
  value,
  onChange,
  label,
  placeholder = 'Search...',
  parent,
  initialLabel,
  disabled,
}: {
  kind: 'profiles' | 'clients' | 'services' | 'service_filters' | 'internal_categories' | 'workflows' | 'job_titles' | 'jobs';
  value: string;
  onChange: (value: string, label: string) => void;
  label: string;
  placeholder?: string;
  parent?: string;
  initialLabel?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Option | null>(null);
  const params = new URLSearchParams({ kind, query, ...(parent ? { parent } : {}) });
  const results = useAdminPage<Option[]>(open ? `/api/admin/lookups?${params}` : null, undefined, 400);
  const resolved = useAdminPage<Option[]>(value && selected?.value !== value ? `/api/admin/lookups?${new URLSearchParams({ kind, id: value })}` : null);
  const selectedLabel = selected?.value === value ? selected.label : (resolved.data?.find((item) => item.value === value)?.label ?? initialLabel ?? '');
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
      <label htmlFor={id} className="mb-1 block text-[11px] font-semibold text-[#202020]">
        {label}
      </label>
      <div className="flex rounded-lg border border-[#DEE2E7] bg-white">
        <input
          id={id}
          type="text"
          maxLength={160}
          autoComplete="off"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
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
          className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-[#8C1010]/10"
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
      </div>
      {open ? (
        <div id={`${id}-options`} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#DEE2E7] bg-white p-1 shadow-lg">
          {results.loading ? (
            <p role="status" className="p-3 text-xs text-gray-500">
              Searching...
            </p>
          ) : results.error ? (
            <p role="alert" className="p-3 text-xs text-red-700">
              {results.error}
            </p>
          ) : results.data?.length ? (
            results.data.map((option) => (
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
            ))
          ) : (
            <p className="p-3 text-xs text-gray-500">No matching results.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
