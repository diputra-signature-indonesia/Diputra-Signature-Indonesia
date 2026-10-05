import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { adminSelectLookupId, adminSelectOptions } from '../../src/components/layout-admin/admin-select-options.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const fixed = [
  { value: '', label: 'All Categories' },
  { value: 'uncategorized', label: 'Uncategorized' },
];

test('fixed category choices do not trigger invalid UUID lookups', () => {
  assert.equal(adminSelectLookupId('', fixed), null);
  assert.equal(adminSelectLookupId('uncategorized', fixed), null);
  assert.equal(adminSelectLookupId('category-id', fixed), 'category-id');
  assert.equal(adminSelectLookupId('category-id', fixed, 'category-id'), null);
});
test('fixed and remote choices combine without duplicates and filter special choices', () => {
  const remote = [
    { value: 'category-70', label: 'Visa' },
    { value: 'uncategorized', label: 'Duplicate' },
  ];
  assert.deepEqual(adminSelectOptions(fixed, remote, ''), [...fixed, remote[0]]);
  assert.deepEqual(adminSelectOptions(fixed, [], '  UNCAT '), [fixed[1]]);
  assert.deepEqual(adminSelectOptions(fixed, [], 'visa'), []);
});
function render(props, { open = false, loading = false } = {}) {
  const calls = [];
  const source = readFileSync(new URL('../../src/components/layout-admin/admin-remote-select.tsx', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mocks = {
    react: { ...React, useId: () => 'category-field', useRef: () => ({ current: null }), useState: (value) => [typeof value === 'boolean' ? open : value, () => {}] },
    './admin-select-options': { adminSelectLookupId, adminSelectOptions },
    './use-admin-page': {
      useAdminPage: (url, initial, delay) => {
        calls.push({ url, delay });
        return { data: [], loading: Boolean(url && loading) };
      },
    },
  };
  const exports = {};
  new Function('require', 'exports', output)((name) => (name in mocks ? mocks[name] : require(name)), exports);
  return {
    html: renderToStaticMarkup(React.createElement(exports.AdminRemoteSelect, { kind: 'internal_categories', label: 'Category', value: '', onChange: () => {}, ...props })),
    calls,
  };
}
test('category control has one label, 40px border-box height and selected special value', () => {
  const { html, calls } = render({ size: 'md', showDropdownIndicator: true, value: 'uncategorized', fixedOptions: fixed });
  assert.equal((html.match(/<label /g) ?? []).length, 1);
  assert.match(html, /value="Uncategorized"/);
  assert.match(html, /h-10/);
  assert.match(html, /h-full/);
  assert.match(html, /text-sm/);
  assert.match(html, /Open Category choices/);
  assert.ok(calls.every((call) => call.url === null));
});
test('special filter choices remain available during debounced remote loading', () => {
  const { html, calls } = render({ fixedOptions: fixed }, { open: true, loading: true });
  assert.equal((html.match(/role="option"/g) ?? []).length, 2);
  assert.match(html, /All Categories/);
  assert.match(html, /Uncategorized/);
  assert.match(html, /Searching/);
  assert.equal(calls[0].delay, 400);
  assert.equal(calls[1].url, null);
});
test('other remote-select consumers retain compact defaults and lazy ID resolution', () => {
  const { html, calls } = render({ kind: 'profiles', value: 'user-70', initialLabel: 'Selected User' });
  assert.match(html, /h-9/);
  assert.match(html, /h-full/);
  assert.match(html, /text-xs/);
  assert.match(html, /value="Selected User"/);
  assert.doesNotMatch(html, /Open Category choices/);
  assert.equal(calls[0].url, null);
  assert.match(calls[1].url, /id=user-70/);
});

test('filter controls match compact admin fields without an extra border-height offset', () => {
  const { html } = render({ appearance: 'filter', showDropdownIndicator: true });
  assert.match(html, /h-9/);
  assert.match(html, /bg-\[#F5F6F8\]/);
  assert.match(html, /border-\[#DEE2E7\]/);
  assert.match(html, /h-full/);
  assert.match(html, /Open Category choices/);
  const active = render({ appearance: 'filter', value: 'uncategorized', fixedOptions: fixed }).html;
  assert.match(active, /bg-\[#FFFBEA\]/);
});

test('required label suffix renders inside one accessible field label', () => {
  const { html } = render({ size: 'md', labelSuffix: React.createElement('span', { className: 'text-red-700' }, '*') });
  assert.equal((html.match(/<label /g) ?? []).length, 1);
  assert.match(html, /Category<span|Category <span/);
  assert.match(html, /text-red-700/);
});
