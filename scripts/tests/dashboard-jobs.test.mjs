import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function compile(path, mocks = {}) {
  const output = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => (name in mocks ? mocks[name] : require(name)), exports);
  return exports;
}
const rpcResult = {
  counts: { active: 4, completed: 2, overdue: 1 },
  taskLoads: [{ id: 'assignee', name: 'Display Name', notStarted: 12, inProgress: 3, delayed: 1 }],
  internalServices: [{ id: 'service', label: 'Visa', value: 6 }],
  attention: [
    {
      id: 'job-1',
      title: 'Job without Tasks',
      due_date: '2026-10-19',
      client_name: 'Client',
      pic_name: 'Job Owner',
      service_name: 'Visa',
      priority_name: null,
      priority_color: null,
      status_name: 'In Progress',
      status_color: '#EAB308',
      progress: 50,
    },
  ],
  statuses: [{ value: 'job-status-id', label: 'In Progress' }],
};
function harness(error = null) {
  const calls = [];
  const { getDashboardData } = compile('src/lib/supabase/queries/dashboard.ts', {
    'server-only': {},
    '@/lib/admin-deadline': { makassarToday: () => '2026-10-19' },
    '@/lib/supabase/server': {
      createSupabaseServerClient: async () => ({
        rpc: (name, args) => {
          calls.push({ name, args });
          const query = {
            abortSignal(signal) {
              calls[0].signal = signal;
              return query;
            },
            then(resolve) {
              return Promise.resolve({ data: rpcResult, error }).then(resolve);
            },
          };
          return query;
        },
      }),
    },
  });
  return { calls, getDashboardData };
}

test('Job panels and Task workload map independent database aggregates in one RPC', async () => {
  const { calls, getDashboardData } = harness();
  const signal = new AbortController().signal;
  const filters = { pic: 'owner', status: 'job-status-id', dateFrom: '2026-10-19', dateTo: '2026-10-26' };
  const data = await getDashboardData(filters, signal);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'search_admin_dashboard');
  assert.deepEqual(calls[0].args, { p_filters: filters });
  assert.equal(calls[0].signal, signal);
  assert.equal(data.metrics[0].label, 'Total Job Aktif');
  assert.equal(data.metrics[0].value, 4);
  assert.equal(data.metrics[4].value, 2);
  assert.equal(data.internalServices[0].value, 6);
  assert.deepEqual(data.taskLoads, rpcResult.taskLoads);
  assert.deepEqual(data.filterOptions.statuses, rpcResult.statuses);
  assert.equal(data.attentionJobs[0].id, 'job-1');
  assert.equal(data.attentionJobs[0].title, 'Job without Tasks');
  assert.equal(data.attentionJobs[0].pic, 'Job Owner');
  assert.equal(data.attentionJobs[0].progress, 50);
  assert.equal(data.attentionJobs[0].deadline, 'Hari ini');
  assert.equal(data.attentionJobs[0].deadlineTone, 'urgent');
  assert.equal(data.attentionJobs[0].priority, 'Tanpa prioritas');
});

test('Job attention deadline labels handle overdue, tomorrow, next week and no deadline', async () => {
  const original = rpcResult.attention;
  try {
    rpcResult.attention = ['2026-10-18', '2026-10-20', '2026-10-26', null].map((due_date, index) => ({ ...original[0], id: 'job-' + index, due_date }));
    const { getDashboardData } = harness();
    const { attentionJobs } = await getDashboardData();
    assert.deepEqual(
      attentionJobs.map((j) => j.deadline),
      ['Lewat 1 hari', 'Besok', 'H-7', 'Tanpa deadline']
    );
    assert.deepEqual(
      attentionJobs.map((j) => j.deadlineTone),
      ['urgent', 'warning', 'warning', 'normal']
    );
  } finally {
    rpcResult.attention = original;
  }
});

test('Dashboard query errors are propagated, not silently replaced with zero cards', async () => {
  const error = new Error('Read denied');
  await assert.rejects(harness(error).getDashboardData(), error);
});

test('Diagram renders Total Job including completed Jobs and keeps only the legend scrollable', () => {
  const { DashboardCategoryCard } = compile('src/components/admin-dashboard/dashboard-category-card.tsx');
  const html = renderToStaticMarkup(React.createElement(DashboardCategoryCard, { internalServices: [{ id: 'service', label: 'Visa', value: 6, color: '#7B0000' }] }));
  assert.match(html, /<h2[^>]*>Total Job<\/h2>/);
  assert.match(html, />6<\/strong>/);
  assert.match(html, />Total Job<\/span>/);
  assert.match(html, /aria-label="Legenda job per Internal Service"[^>]*overflow-y-auto/);
  assert.doesNotMatch(html, /Total Task|Task Berdasarkan/);
});

test('Job attention labels and links open Job detail rather than Task Assignment', async () => {
  const { DashboardAttentionTable } = compile('src/components/admin-dashboard/dashboard-attention-table.tsx', {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  });
  const data = await harness().getDashboardData();
  const html = renderToStaticMarkup(React.createElement(DashboardAttentionTable, { jobs: data.attentionJobs }));
  assert.match(html, /Job Memerlukan Perhatian/);
  assert.match(html, /Klien &amp; Job/);
  assert.match(html, /Lihat Semua Job/);
  assert.match(html, /Job without Tasks/);
  assert.match(html, /href="\/admin\/all-jobs\/job-1"/);
  assert.match(html, /aria-label="Buka job Job without Tasks"/);
  assert.doesNotMatch(html, /tab=assignment|Task Memerlukan|Lihat Semua Task/);
  const empty = renderToStaticMarkup(React.createElement(DashboardAttentionTable, { jobs: [] }));
  assert.match(empty, /Tidak ada job yang memerlukan perhatian/);
});

test('PIC workload retains Task terminology and a scrollable list with fixed legend', () => {
  const { DashboardPicLoadCard } = compile('src/components/admin-dashboard/dashboard-pic-load-card.tsx');
  const html = renderToStaticMarkup(React.createElement(DashboardPicLoadCard, { taskLoads: rpcResult.taskLoads }));
  assert.match(html, /Beban Task per PIC/);
  assert.match(html, /Display Name/);
  assert.match(html, /16 Task/);
  assert.match(html, /aria-label="Daftar beban task per PIC"[^>]*overflow-y-auto/);
});

test('Forward migration only replaces the existing read function, without schema or record mutations', () => {
  const sql = source('supabase/migrations/20261019100000_dashboard_job_metrics.sql');
  const uncommented = sql.replace(/--[^\n]*/g, '');
  const outsideBody = uncommented.replace(/\$\$[\s\S]*?\$\$/g, () => '$$BODY$$').trim();
  assert.match(
    outsideBody,
    /^begin;\s*create or replace function public\.search_admin_dashboard\(p_filters jsonb default '\{\}'::jsonb\)\s*returns jsonb language plpgsql stable security definer set search_path='' as \$\$BODY\$\$;\s*commit;$/
  );
  assert.doesNotMatch(uncommented, /\b(?:alter\s+table|create\s+(?:table|index|policy)|insert\s+into|update\s+public\.|delete\s+from|truncate|grant|revoke)\b/i);
  assert.match(sql, /order by due_date nulls last,title,id limit 10/);
  assert.match(sql, /nullif\(btrim\(p\.display_name\),''\),p\.email/);
});
