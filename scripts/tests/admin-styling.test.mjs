import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function component(path, mocks = {}) {
  const output = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => (name in mocks ? mocks[name] : require(name)), exports);
  return exports;
}
const { AdminSearchField } = component('src/components/layout-admin/admin-search-field.tsx');
function panel(path, name, data, open = false) {
  const calls = [];
  const mocks = {
    react: { ...React, useState: (initial) => [typeof initial === 'boolean' ? open : initial, () => {}] },
    '@/components/layout-admin/use-admin-page': {
      useAdminPage: (url, initial, delay) => {
        calls.push({ url, delay });
        return { data, loading: false };
      },
    },
    '@/components/layout-admin/admin-search-field': { AdminSearchField },
    '@/components/layout-admin/admin-modal': { AdminModal: ({ open, children }) => (open ? React.createElement('div', { role: 'dialog' }, children) : null) },
    '@/components/admin-all-jobs/all-jobs-pagination': { AllJobsPagination: ({ noun, totalItems }) => React.createElement('footer', null, totalItems + ' ' + noun) },
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  };
  const Comp = component(path, mocks)[name];
  return { html: renderToStaticMarkup(React.createElement(Comp, { selectedId: 'service-0', onSelect: () => {}, jobId: 'job-0', clientName: 'Client' })), calls };
}

test('normal search uses Internal Services styling, icon and associated single label', () => {
  const html = renderToStaticMarkup(React.createElement(AdminSearchField, { id: 'search', label: 'Search Users', value: '', onChange: () => {}, placeholder: 'Name or email...' }));
  assert.match(html, /type="search"/);
  assert.match(html, /h-10 border-\[#D6DAE0\] bg-white/);
  assert.match(html, /lucide-search/);
  assert.match(html, /for="search"/);
  assert.equal((html.match(/<label /g) ?? []).length, 1);
});
test('sidebar search retains production grey compact style and hidden accessible label', () => {
  const html = renderToStaticMarkup(React.createElement(AdminSearchField, { compact: true, hideLabel: true, label: 'Search services', value: '', onChange: () => {}, placeholder: 'Services...' }));
  assert.match(html, /h-9 border-\[#DEE2E7\] bg-\[#F5F6F8\]/);
  assert.match(html, /class="sr-only"/);
  assert.match(html, /lucide-search/);
});
const services = Array.from({ length: 10 }, (_, index) => ({ id: 'service-' + index, title: 'Service ' + index, summary: 'Internal service procedure.' }));
test('SOP preview restores production border, subtitle, dots and five items with no jobs paginator', () => {
  const { html, calls } = panel('src/components/admin-sop/sop-service-list.tsx', 'SopServiceList', { services, total: 70, page: 1 });
  assert.match(html, /border-\[#D9DDE3\]/);
  assert.match(html, /Select a service to view its internal SOP/);
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 5);
  assert.match(html, /bg-\[#E4C5C1\]/);
  assert.match(html, /View All Services/);
  assert.doesNotMatch(html, /<footer|70 jobs/);
  assert.match(calls[0].url, /page=1/);
  assert.equal(calls[0].delay, 400);
  assert.equal(calls[1].url, null);
});
test('SOP full list is lazy and paginated with service-specific count', () => {
  const { html, calls } = panel('src/components/admin-sop/sop-service-list.tsx', 'SopServiceList', { services, total: 70, page: 1 }, true);
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 15);
  assert.match(html, /70 services/);
  assert.ok(calls[1].url);
  assert.equal(calls[1].delay, 400);
});
test('related jobs retain compact search, status and priority badges and View All modal', () => {
  const jobs = [{ id: 'job-1', title: 'Job One', deadlineNote: 'Due tomorrow', priority: 'High', status: 'On Hold', priorityColor: '#C32929', statusColor: '#194DB8' }];
  const { html, calls } = panel('src/components/admin-job-detail/live-more-from-client-card.tsx', 'LiveMoreFromClientCard', { jobs, total: 70, page: 1 });
  assert.match(html, /View All Jobs/);
  assert.match(html, /Due tomorrow/);
  assert.match(html, /High/);
  assert.match(html, /On Hold/);
  assert.match(html, /border-\[#D9DDE3\]/);
  assert.doesNotMatch(html, /<footer/);
  assert.equal(calls[0].delay, 400);
  assert.equal(calls[1].url, null);
});
test('Master Data, User Management and Client Services use shared styled search', () => {
  for (const path of [
    'src/components/admin-master-data/master-data-workspace.tsx',
    'src/components/admin-user-management/user-management-workspace.tsx',
    'src/components/admin-public-services/public-services-workspace.tsx',
  ]) {
    assert.match(source(path), /<AdminSearchField/);
  }
  const master = source('src/components/admin-master-data/master-data-workspace.tsx');
  assert.match(master, /label=\{\x60Search \$\{selectedCategory.label\}/);
  assert.match(master, /bg-\[#FAFBFC\]/);
});

test('My Tasks pagination remains inside Job List before its View All footer', () => {
  const { JobListCard } = component('src/components/admin-my-tasks/job-list-card.tsx', {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    './my-task-status-badge': { MyTaskStatusBadge: () => null },
  });
  const html = renderToStaticMarkup(
    React.createElement(JobListCard, {
      jobs: [],
      selectedJobId: '',
      query: '',
      onQueryChange: () => {},
      onJobSelect: () => {},
      pagination: React.createElement('nav', { 'aria-label': 'jobs pagination' }, 'Page 1'),
    })
  );
  assert.ok(html.indexOf('jobs pagination') < html.indexOf('View All Jobs'));
  assert.ok(html.indexOf('jobs pagination') < html.indexOf('</aside>'));
});
