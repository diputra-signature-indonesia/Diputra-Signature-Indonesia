export type AdminSelectOption = { value: string; label: string };

// Special UI choices (e.g. Uncategorized) must never be sent as UUID lookups.
export function adminSelectLookupId(value: string, fixedOptions: readonly AdminSelectOption[], selectedValue?: string) {
  return value && value !== selectedValue && !fixedOptions.some((option) => option.value === value) ? value : null;
}

export function adminSelectOptions(fixedOptions: readonly AdminSelectOption[], remoteOptions: readonly AdminSelectOption[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  const fixed = fixedOptions.filter((option) => option.label.toLocaleLowerCase().includes(search));
  const reserved = new Set(fixedOptions.map((option) => option.value));
  return [...fixed, ...remoteOptions.filter((option) => !reserved.has(option.value))];
}
