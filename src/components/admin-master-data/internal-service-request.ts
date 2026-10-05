import type { InternalServiceSearchPage } from '@/data/admin-master-data/internal-service-search';

type Options = { url: string; delay: number; onSuccess: (page: InternalServiceSearchPage) => void; onError: (message: string) => void; fetcher?: typeof fetch };

export function scheduleInternalServiceRequest({ url, delay, onSuccess, onError, fetcher = fetch }: Options) {
  const controller = new AbortController();
  let cancelled = false;
  const timer = setTimeout(async () => {
    try {
      const response = await fetcher(url, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'Unable to load services. Please retry.');
      if (!cancelled) onSuccess(body as InternalServiceSearchPage);
    } catch (error) {
      if (!cancelled) onError(error instanceof Error ? error.message : 'Unable to load services. Please retry.');
    }
  }, delay);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    controller.abort();
  };
}
