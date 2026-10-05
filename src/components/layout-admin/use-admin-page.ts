'use client';
import { useEffect, useState } from 'react';
import { scheduleAdminPageRequest } from './admin-page-request';

// URL keys identify filter snapshots. A cancellation flag also protects against
// fetchers/cache layers that deliver a response despite AbortController.
export function useAdminPage<T>(url: string | null, initial?: T, delay = 0) {
  const [initialUrl] = useState(initial === undefined ? null : url);
  const [state, setState] = useState<{ url: string | null; data?: T; error?: string }>({ url: null, data: initial });
  useEffect(() => {
    if (!url || url === initialUrl) return;
    return scheduleAdminPageRequest<T>({
      url,
      delay,
      onSuccess: (data) => setState({ url, data }),
      onError: (error) => setState((previous) => ({ url, data: previous.data, error })),
    });
  }, [url, delay, initialUrl]);
  if (url === initialUrl && initial !== undefined) return { data: initial, error: undefined, loading: false };
  return { data: state.data, error: state.url === url ? state.error : undefined, loading: Boolean(url && state.url !== url) };
}
