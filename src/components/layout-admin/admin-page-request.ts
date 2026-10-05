type Options<T> = { url: string; delay: number; onSuccess: (page: T) => void; onError: (message: string) => void; fetcher?: typeof fetch };
export function scheduleAdminPageRequest<T>({ url, delay, onSuccess, onError, fetcher = fetch }: Options<T>) {
  const controller = new AbortController();
  let cancelled = false;
  const timer = setTimeout(async () => {
    try {
      const response = await fetcher(url, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'Unable to load data.');
      if (!cancelled) onSuccess(body as T);
    } catch (error) {
      if (!cancelled) onError(error instanceof Error ? error.message : 'Unable to load data.');
    }
  }, delay);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    controller.abort();
  };
}
