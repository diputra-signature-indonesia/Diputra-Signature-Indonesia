import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function compile(path, mocks) {
  const output = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => (name in mocks ? mocks[name] : require(name)), exports);
  return exports;
}
function action({ error = null } = {}) {
  const calls = [];
  const { updateOwnDisplayNameAction } = compile('src/app/admin/account-actions.ts', {
    '@/lib/auth/admin-access': {
      requireActiveAdmin: async () => {
        calls.push('auth');
        return { userId: 'self', role: 'staff' };
      },
    },
    '@/lib/supabase/server': {
      createSupabaseServerClient: async () => ({
        rpc: async (name, args) => {
          calls.push({ name, args });
          return { data: args.p_display_name, error };
        },
      }),
    },
    'next/cache': { revalidatePath: (...args) => calls.push(args) },
  });
  return { save: updateOwnDisplayNameAction, calls };
}
test('save requires active authentication and accepts only a trimmed display-name value', async () => {
  const { save, calls } = action();
  assert.deepEqual(await save('  New Name  '), { ok: true, displayName: 'New Name' });
  assert.equal(calls[0], 'auth');
  assert.deepEqual(calls[1], { name: 'set_own_display_name', args: { p_display_name: 'New Name' } });
  assert.deepEqual(calls[2], ['/admin', 'layout']);
});
test('invalid or forged account data never reaches a mutation RPC', async () => {
  for (const input of ['', ' '.repeat(5), 'a'.repeat(161), 'Bad\nName', { displayName: 'Name', id: 'another-user', role: 'super_admin' }]) {
    const { save, calls } = action();
    assert.equal((await save(input)).ok, false);
    assert.deepEqual(calls, ['auth']);
  }
});
test('database failures never claim success or revalidate layout', async () => {
  const { save, calls } = action({ error: { code: '42501' } });
  assert.equal((await save('Name')).ok, false);
  assert.equal(calls.length, 2);
});
test('account modal has a single editable field and read-only public details', () => {
  const data = {
    displayName: 'Admin Name',
    role: 'staff',
    email: 'self@example.test',
    publicProfile: { fullName: 'Public Name', jobTitle: 'Associate', shortBio: 'Public bio', isVisible: false, avatarUrl: null, nickname: null },
  };
  const { AdminAccountModal } = compile('src/components/layout-admin/admin-account-modal.tsx', {
    '@/app/admin/account-actions': {},
    '@/types/auth-role': { ASSIGNABLE_ADMIN_ROLES: [{ value: 'staff', label: 'Staff' }] },
    '@mui/material': { Avatar: ({ children }) => React.createElement('div', null, children) },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    './use-admin-page': { useAdminPage: () => ({ data, loading: false }) },
    './admin-modal': { AdminModal: ({ children, footer }) => React.createElement('section', null, children, footer) },
  });
  const html = renderToStaticMarkup(React.createElement(AdminAccountModal, { onClose() {}, onSaved() {} }));
  assert.equal((html.match(/<input/g) ?? []).length, 1);
  assert.match(html, /name="displayName"/);
  assert.match(html, /Read only/);
  assert.match(html, /self@example.test/);
  assert.match(html, /Public Name/);
  assert.match(html, /Associate/);
  assert.match(html, /Hidden from About page/);
  assert.match(html, /Save Display Name/);
  data.displayName = null;
  const legacyHtml = renderToStaticMarkup(React.createElement(AdminAccountModal, { initialName: 'Login Name', onClose() {}, onSaved() {} }));
  assert.match(legacyHtml, /value="Login Name"/);
  assert.match(legacyHtml, /Public Name/);
});
