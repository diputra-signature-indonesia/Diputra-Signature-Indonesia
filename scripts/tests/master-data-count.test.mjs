import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { masterDataCategoryDefinitions } from '../../src/data/admin-master-data/master-data.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function compile(path, mocks) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => (name in mocks ? mocks[name] : require(name)), exports);
  return exports;
}
function queryHarness({ total = 1075, countError = null } = {}) {
  const calls = [];
  const query = compile('../../src/lib/supabase/queries/master-data.ts', {
    'server-only': {},
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({
      rpc(name) {
        calls.push({ rpc: name });
        const counts = Object.fromEntries(masterDataCategoryDefinitions.map(c => [c.id, c.id === 'priorities' ? 1 : c.id === 'internal-services' ? total : 0]));
        return Promise.resolve({ data: counts, error: countError });
      },
    }) },
    '@/data/admin-master-data/master-data': { masterDataCategoryDefinitions },
  });
  return { get: query.getMasterDataCategories, calls };
}
const { MasterDataCategoryList } = compile('../../src/components/admin-master-data/master-data-category-list.tsx', {});
function serviceBadge(category) {
  const html = renderToStaticMarkup(React.createElement(MasterDataCategoryList, { categories: [category], selectedId: 'internal-services', onSelect() {} }));
  return html.match(/<button\b[\s\S]*?<\/button>/)?.[0];
}
test('Internal Services badge uses exact catalogue count while page rows stay unloaded', async () => {
  const { get, calls } = queryHarness();
  const categories = await get();
  const services = categories.find((category) => category.id === 'internal-services');
  assert.deepEqual(services.rows, []);
  assert.equal(services.totalCount, 1075);
  assert.match(serviceBadge(services), />1075<\/span>/);
  assert.equal(categories.find((category) => category.id === 'priorities').totalCount, 1);
  assert.deepEqual(calls, [{ rpc: 'admin_master_counts' }]);
});
test('filtering/page rows cannot replace total catalogue badge count', async () => {
  const { get } = queryHarness({ total: 70 });
  const services = (await get()).find((category) => category.id === 'internal-services');
  assert.match(serviceBadge({ ...services, rows: Array.from({ length: 10 }, () => ({})) }), />70<\/span>/);
  assert.match(serviceBadge({ ...services, rows: [] }), />70<\/span>/);
});
test('zero is valid and preserved, while missing/failed counts cannot silently become zero', async () => {
  const { get } = queryHarness({ total: 0 });
  const services = (await get()).find((category) => category.id === 'internal-services');
  assert.match(serviceBadge({ ...services, rows: [{}] }), />0<\/span>/);
  await assert.rejects(queryHarness({ total: null }).get(), /No count returned/);
  await assert.rejects(queryHarness({ total: null, countError: { message: 'permission denied' } }).get(), /Unable to load Master Data counts/);
});
test('query count is fixed: increasing catalogue size does not introduce N+1 requests', async () => {
  for (const total of [1, 70, 1075]) {
    const { get, calls } = queryHarness({ total });
    await get();
    assert.equal(calls.length, 1);
    assert.deepEqual(calls, [{ rpc: 'admin_master_counts' }]);
  }
});
