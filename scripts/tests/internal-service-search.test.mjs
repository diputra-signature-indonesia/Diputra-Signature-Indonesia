import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERNAL_SERVICE_SEARCH_DELAY, internalServiceSearchUrl, normalizeInternalServiceSearch } from '../../src/data/admin-master-data/internal-service-search.ts';
import { scheduleInternalServiceRequest } from '../../src/components/admin-master-data/internal-service-request.ts';

const page = { rows: [], total: 0, page: 1, pageCount: 1, first: 0, last: 0 };
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('search URL preserves literal text safely and sends requested page/category', () => {
  const url = new URL(internalServiceSearchUrl({ search: '  company   & visa_%  ', categoryId: 'uncategorized', page: 7 }), 'http://localhost');
  assert.equal(url.searchParams.get('search'), 'company & visa_%');
  assert.equal(url.searchParams.get('page'), '7');
  assert.equal(url.searchParams.get('category'), 'uncategorized');
});

test('invalid page/category/search parameters are rejected before fetching', () => {
  for (const input of [
    { search: '', categoryId: '', page: 0 },
    { search: '', categoryId: '', page: 1.5 },
    { search: '', categoryId: '', page: 2147483648 },
    { search: '', categoryId: 'forged-filter', page: 1 },
    { search: 'a'.repeat(161), categoryId: '', page: 1 },
  ]) {
    assert.throws(() => normalizeInternalServiceSearch(input));
  }
});

test('400 ms debounce cancels intermediate keystrokes and sends only final query', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const urls = [];
  const results = [];
  const request = (url) =>
    scheduleInternalServiceRequest({
      url,
      delay: INTERNAL_SERVICE_SEARCH_DELAY,
      onSuccess: (data) => results.push(data),
      onError: assert.fail,
      fetcher: async (url) => {
        urls.push(url);
        return Response.json(page);
      },
    });
  let cancel = request('/?search=v');
  t.mock.timers.tick(100);
  cancel();
  cancel = request('/?search=vi');
  t.mock.timers.tick(100);
  cancel();
  request('/?search=visa');
  t.mock.timers.tick(399);
  assert.equal(urls.length, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual(urls, ['/?search=visa']);
  assert.deepEqual(results, [page]);
});

test('category/page changes can request immediately and use no-store', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const requests = [];
  scheduleInternalServiceRequest({
    url: '/?page=2',
    delay: 0,
    onSuccess: () => {},
    onError: assert.fail,
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return Response.json(page);
    },
  });
  t.mock.timers.tick(0);
  await flush();
  assert.equal(requests[0].url, '/?page=2');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.equal(requests[0].options.credentials, 'same-origin');
});

test('cancelled in-flight responses cannot overwrite the newest search', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const results = [];
  let resolveOld;
  let oldSignal;
  const cancel = scheduleInternalServiceRequest({
    url: '/old',
    delay: 0,
    onSuccess: (data) => results.push(data),
    onError: assert.fail,
    fetcher: (_url, options) => {
      oldSignal = options.signal;
      return new Promise((resolve) => {
        resolveOld = resolve;
      });
    },
  });
  t.mock.timers.tick(0);
  cancel();
  assert.equal(oldSignal.aborted, true);
  scheduleInternalServiceRequest({ url: '/new', delay: 0, onSuccess: (data) => results.push(data), onError: assert.fail, fetcher: async () => Response.json({ ...page, total: 70 }) });
  t.mock.timers.tick(0);
  await flush();
  resolveOld(Response.json({ ...page, total: 60 }));
  await flush();
  assert.deepEqual(
    results.map((result) => result.total),
    [70]
  );
});

test('failed cancelled requests are ignored while active errors are shown', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const errors = [];
  let rejectOld;
  const cancel = scheduleInternalServiceRequest({
    url: '/old',
    delay: 0,
    onSuccess: assert.fail,
    onError: (error) => errors.push(error),
    fetcher: () =>
      new Promise((_resolve, reject) => {
        rejectOld = reject;
      }),
  });
  t.mock.timers.tick(0);
  cancel();
  rejectOld(new Error('Cancelled'));
  scheduleInternalServiceRequest({
    url: '/denied',
    delay: 0,
    onSuccess: assert.fail,
    onError: (error) => errors.push(error),
    fetcher: async () => Response.json({ message: 'Active staff access is required.' }, { status: 403 }),
  });
  t.mock.timers.tick(0);
  await flush();
  assert.deepEqual(errors, ['Active staff access is required.']);
});
