'use client';
import {
  INTERNAL_SERVICE_SEARCH_DELAY,
  internalServiceSearchUrl,
  normalizeInternalServiceSearch,
  type InternalServiceSearchInput,
  type InternalServiceSearchPage,
} from '@/data/admin-master-data/internal-service-search';
import { useEffect, useRef, useState } from 'react';
import { scheduleInternalServiceRequest } from './internal-service-request';

export function useInternalServiceSearch(input: InternalServiceSearchInput, enabled: boolean, refreshKey: number) {
  const url = internalServiceSearchUrl(input);
  const search = normalizeInternalServiceSearch(input).search;
  const key = url + '&revision=' + refreshKey;
  const previousSearch = useRef<string | null>(null);
  const [state, setState] = useState<{ key: string; data: InternalServiceSearchPage | null; error: string | null }>({ key: '', data: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    const delay = previousSearch.current !== null && previousSearch.current !== search ? INTERNAL_SERVICE_SEARCH_DELAY : 0;
    previousSearch.current = search;
    return scheduleInternalServiceRequest({
      url,
      delay,
      onSuccess: (data) => setState({ key, data, error: null }),
      onError: (error) => setState((current) => ({ key, data: current.data, error })),
    });
  }, [enabled, search, key, url]);
  return { data: state.data, isLoading: enabled && state.key !== key, error: state.key === key ? state.error : null };
}
