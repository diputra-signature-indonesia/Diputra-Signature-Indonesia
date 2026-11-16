import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function compile(path, mocks = {}, globals = {}) {
  const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), code)((name) => (name in mocks ? mocks[name] : require(name)), exports, ...Object.values(globals));
  return exports;
}
const analytics = compile('src/lib/site-analytics.ts');

test('GA uses the supplied measurement ID and only canonical Production hosts', () => {
  assert.equal(analytics.GOOGLE_ANALYTICS_ID, 'G-35HJ3QBMKJ');
  for (const host of ['diputrasignature.com', 'www.diputrasignature.com']) assert.equal(analytics.isAnalyticsProductionHost(host), true);
  for (const host of ['localhost', '127.0.0.1', 'preview.vercel.app', 'diputrasignature.com.evil.test']) assert.equal(analytics.isAnalyticsProductionHost(host), false);
});

test('Public routes are allowed but admin, auth, access and review-token routes are excluded', () => {
  for (const path of ['/', '/about', '/contact', '/services', '/services/visa', '/services/legal-and-corporate/company-setup', '/blog', '/blog/news'])
    assert.equal(analytics.isPublicAnalyticsPath(path), true, path);
  for (const path of ['/admin', '/admin/dashboard', '/login', '/auth/callback', '/access-request', '/review-request/private-token', '/api/admin/jobs', '/blogger', '/services-admin'])
    assert.equal(analytics.isPublicAnalyticsPath(path), false, path);
});

test('Google tag initializes once and queues standard commands before external script loads', () => {
  const target = {};
  analytics.initializeSiteAnalytics(target);
  const commands = target.dataLayer.map((args) => Array.from(args));
  assert.equal(commands.length, 2);
  assert.equal(commands[0][0], 'js');
  assert.ok(commands[0][1] instanceof Date);
  assert.deepEqual(commands[1], ['config', 'G-35HJ3QBMKJ']);
  target[analytics.GOOGLE_ANALYTICS_OPT_OUT] = true;
  analytics.initializeSiteAnalytics(target);
  assert.equal(target.dataLayer.length, 2, 'Strict Mode/remounts do not queue duplicate config/pageviews');
  assert.equal(target[analytics.GOOGLE_ANALYTICS_OPT_OUT], false);
  assert.equal(commands.filter((args) => args[0] === 'event').length, 0, 'History pageviews are left to GA Enhanced Measurement, not sent twice manually');
});

test('Existing dataLayer and gtag are preserved rather than overwritten', () => {
  const dataLayer = [{ existing: true }],
    calls = [];
  const gtag = (...args) => calls.push(args);
  const target = { dataLayer, gtag };
  analytics.initializeSiteAnalytics(target);
  assert.equal(target.dataLayer, dataLayer);
  assert.equal(target.gtag, gtag);
  assert.equal(dataLayer.length, 1);
  assert.equal(calls[1][1], analytics.GOOGLE_ANALYTICS_ID);
});

function renderAnalytics({ host = 'diputrasignature.com', pathname = '/' } = {}) {
  const effects = [],
    trackingCalls = [],
    target = { location: { hostname: host } };
  const { SiteGoogleAnalytics } = compile(
    'src/components/layout/site-google-analytics.tsx',
    {
      '@/lib/site-analytics': analytics,
      '@/lib/site-contact-tracking': {
        attachContactClickTracking: (analyticsWindow, doc) => {
          assert.equal(analyticsWindow, target);
          assert.ok(doc);
          trackingCalls.push('attach');
          return () => trackingCalls.push('detach');
        },
      },
      'next/navigation': { usePathname: () => pathname },
      'next/script': { default: (props) => React.createElement('script', { id: props.id, src: props.src, 'data-strategy': props.strategy }) },
      react: {
        useSyncExternalStore: (_subscribe, snapshot, serverSnapshot) => {
          assert.equal(serverSnapshot(), false);
          return snapshot();
        },
        useEffect: (callback) => effects.push(callback),
      },
    },
    { window: target, document: {} }
  );
  const html = renderToStaticMarkup(React.createElement(SiteGoogleAnalytics));
  const cleanup = effects.map((effect) => effect());
  return { html, target, cleanup, trackingCalls };
}

test('GA script is non-blocking and public-layout cleanup opts out on leaving the site', () => {
  const { html, target, cleanup, trackingCalls } = renderAnalytics();
  assert.match(html, /googletagmanager\.com\/gtag\/js\?id=G-35HJ3QBMKJ/);
  assert.match(html, /data-strategy="afterInteractive"/);
  assert.equal(target.dataLayer.length, 2);
  assert.deepEqual(trackingCalls, ['attach']);
  cleanup.forEach((fn) => fn());
  assert.deepEqual(trackingCalls, ['attach', 'detach']);
  assert.equal(target[analytics.GOOGLE_ANALYTICS_OPT_OUT], true);
});

test('Local/preview hosts and private routes never load or configure the GA script', () => {
  for (const options of [{ host: 'localhost' }, { host: '127.0.0.1' }, { host: 'preview.vercel.app' }, { pathname: '/admin/dashboard' }, { pathname: '/auth/callback' }]) {
    const { html, target, trackingCalls } = renderAnalytics(options);
    assert.equal(html, '');
    assert.equal(target.dataLayer, undefined);
    assert.equal(target[analytics.GOOGLE_ANALYTICS_OPT_OUT], true);
    assert.deepEqual(trackingCalls, []);
  }
});

test('Only the public layout mounts Analytics and it excludes Vercel Preview/development builds', () => {
  const site = source('src/app/(site)/layout.tsx');
  assert.match(site, /process\.env\.NODE_ENV === 'production'/);
  assert.match(site, /process\.env\.VERCEL_ENV === 'production'/);
  assert.match(site, /<Suspense fallback=\{null\}>\s*<SiteGoogleAnalytics \/>/);
  for (const path of ['src/app/layout.tsx', 'src/app/admin/layout.tsx', 'src/app/login/page.tsx']) assert.doesNotMatch(source(path), /SiteGoogleAnalytics|googletagmanager/);
});
