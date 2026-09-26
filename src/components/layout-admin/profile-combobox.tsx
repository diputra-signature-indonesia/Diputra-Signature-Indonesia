'use client';

import { Check, LoaderCircle, Search, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export type ProfileComboboxOption = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
};

function ProfileAvatar({ option }: { option: ProfileComboboxOption }) {
  if (option.avatar_url) {
    // Profile images can be hosted by Google or Supabase.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={option.avatar_url} alt="" className="size-7 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F5E7E7] text-[10px] font-bold text-[#8C1010]">{option.display_name.slice(0, 1).toUpperCase() || <UserRound className="size-3.5" />}</span>;
}

export function ProfileCombobox({
  id,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Search user...',
  emptyLabel,
}: {
  id: string;
  value: string;
  options: ProfileComboboxOption[];
  onChange: (profileId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const selected = options.find((option) => option.id === value) ?? null;

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim().toLocaleLowerCase()), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return options.slice(0, 10);
    return options.filter((option) => option.display_name.toLocaleLowerCase().includes(debouncedQuery)).slice(0, 10);
  }, [debouncedQuery, options]);

  function select(profileId: string) {
    onChange(profileId);
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
  }

  return <div ref={rootRef} className="relative">
    <div className={`flex h-10 items-center gap-2 rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] focus-within:border-[#8C1010] focus-within:ring-2 focus-within:ring-[#8C1010]/10 ${disabled ? 'bg-gray-100 opacity-70' : ''}`}>
      {selected && !open ? <ProfileAvatar option={selected} /> : <Search className="size-4 shrink-0 text-[#929BA8]" />}
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        autoComplete="off"
        disabled={disabled}
        value={open ? query : selected?.display_name ?? emptyLabel ?? ''}
        placeholder={placeholder}
        onFocus={() => { setQuery(''); setDebouncedQuery(''); setOpen(true); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9AA2AE]"
      />
      {open && query.trim().toLocaleLowerCase() !== debouncedQuery ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-[#8C1010]" /> : null}
    </div>
    {open && !disabled ? <div id={`${id}-options`} role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-[90] max-h-56 overflow-y-auto rounded-lg border border-[#D9DDE3] bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
      {emptyLabel ? <button type="button" role="option" aria-selected={!value} onMouseDown={(event) => event.preventDefault()} onClick={() => select('')} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-[#F8EFEF] focus-visible:bg-[#F8EFEF] focus-visible:outline-none"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5] text-[#7B8491]"><UserRound className="size-3.5" /></span><span className="min-w-0 flex-1 text-xs font-semibold text-[#4A5563]">{emptyLabel}</span>{!value ? <Check className="size-3.5 text-[#8C1010]" /> : null}</button> : null}
      {filtered.map((option) => <button key={option.id} type="button" role="option" aria-selected={value === option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => select(option.id)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-[#F8EFEF] focus-visible:bg-[#F8EFEF] focus-visible:outline-none"><ProfileAvatar option={option} /><span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#2C3441]">{option.display_name}</span>{value === option.id ? <Check className="size-3.5 shrink-0 text-[#8C1010]" /> : null}</button>)}
      {!filtered.length ? <p className="px-3 py-5 text-center text-[11px] text-[#7B8491]">No users found.</p> : null}
    </div> : null}
  </div>;
}
