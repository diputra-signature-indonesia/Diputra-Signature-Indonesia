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
const consent = compile('src/lib/site-consent.ts');
const analytics = compile('src/lib/site-analytics.ts', { './site-consent': consent });
class TestElement {
  constructor(href) {
    this.href = href;
  }
  matches(selector) {
    return selector === 'a[href]' && !!this.href;
  }
}
class TestDocument extends EventTarget {
  visibilityState = 'visible';
  cookies = new Map();
  cookieWrites = [];
  get cookie() {
    return [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; ');
  }
  set cookie(value) {
    this.cookieWrites.push(value);
    const pair = value.split(';')[0];
    const separator = pair.indexOf('=');
    if (value.includes('Max-Age=0')) this.cookies.delete(pair.slice(0, separator));
    else this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}
class TestWindow extends EventTarget {
  location = {
    hostname: 'diputrasignature.com',
    pathname: '/',
    reload: () => {
      this.reloads++;
    },
  };
  reloads = 0;
  values = new Map();
  localStorage = { getItem: (key) => this.values.get(key) ?? null, setItem: (key, value) => this.values.set(key, value) };
}
const contact = compile('src/lib/site-contact-tracking.ts', { './site-analytics': analytics }, { Element: TestElement });
const runtime = compile('src/lib/site-consent-runtime.ts', { './site-analytics': analytics, './site-consent': consent, './site-contact-tracking': contact });
const allow = { analytics: true, advertising: true };
const deny = { analytics: false, advertising: false };

function fixture(t, region = 'required', options = {}) {
  const target = new TestWindow();
  const doc = new TestDocument();
  const fetches = [];
  target.fetch = async (url, init) => {
    fetches.push({ url, init });
    return { ok: true, json: async () => ({ region }) };
  };
  if (options.raw !== undefined) target.values.set(consent.CONSENT_STORAGE_KEY, options.raw);
  if (options.host) target.location.hostname = options.host;
  let state = runtime.INITIAL_CONSENT;
  const controller = runtime.createConsentController(target, doc, options.enabled ?? true, (value) => {
    state = value;
  });
  t.after(() => controller.dispose());
  const commands = () => (target.dataLayer ?? []).map((args) => Array.from(args));
  const events = () => commands().filter(([command]) => command === 'event');
  const click = (href = 'https://wa.me/6287851021080?text=Private') => {
    const event = new Event('click', { cancelable: true });
    Object.defineProperty(event, 'button', { value: 0 });
    event.composedPath = () => [new TestElement(), new TestElement(href), doc];
    assert.equal(doc.dispatchEvent(event), true);
    assert.equal(event.defaultPrevented, false);
  };
  return { target, doc, controller, fetches, commands, events, click, state: () => state };
}

test('Country decision covers every Google EEA country plus GB/CH and rejects unknown/untrusted input', () => {
  assert.equal(consent.CONSENT_COUNTRIES.length, 32);
  const expected = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE GB CH'.split(' ');
  for (const country of expected) assert.equal(consent.consentRegion(new Headers({ 'x-vercel-ip-country': country }), true), 'required', country);
  for (const country of ['ID', 'US', 'CA', 'JP', 'AU', 'BR', 'ZA']) assert.equal(consent.consentRegion(new Headers({ 'x-vercel-ip-country': country }), true), 'outside', country);
  for (const country of ['', 'ZZ', 'XX', 'EU', 'UK', 'AA', 'USA', 'DE, US']) assert.equal(consent.consentRegion(new Headers({ 'x-vercel-ip-country': country }), true), 'unknown', country);
  assert.equal(consent.consentRegion(new Headers({ 'x-vercel-ip-country': 'US', 'x-forwarded-for': '1.2.3.4', 'accept-language': 'en-US' }), false), 'unknown');
});

test('Region endpoint is request-specific and never cacheable; query/cookie overrides are ignored', async () => {
  for (const trusted of [true, false]) {
    const { GET } = compile('src/app/api/consent-region/route.ts', { '@/lib/site-consent': consent }, { process: { env: { VERCEL: trusted ? '1' : undefined } } });
    for (const [country, expected] of [
      ['DE', 'required'],
      ['US', 'outside'],
      ['', 'unknown'],
    ]) {
      const response = await GET(new Request('https://diputrasignature.com/api/consent-region?country=US&consent=granted', { headers: { 'x-vercel-ip-country': country, cookie: 'country=US' } }));
      assert.deepEqual(await response.json(), { region: trusted ? expected : 'unknown' });
      assert.match(response.headers.get('cache-control'), /private, no-store/);
      assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
      assert.equal(response.headers.get('vercel-cdn-cache-control'), 'no-store');
      assert.equal(response.headers.get('vary'), 'X-Vercel-IP-Country');
      assert.equal(response.headers.get('set-cookie'), null);
    }
  }
});

test('Consent records expire at 180 days and reject old versions, tampering and future dates', () => {
  const now = 1_800_000_000_000;
  const record = consent.makeConsentRecord(allow, now);
  assert.equal(record.expiresAt - record.updatedAt, 180 * 24 * 60 * 60 * 1000);
  assert.deepEqual(consent.parseConsentRecord(JSON.stringify(record), now + 1), record);
  assert.equal(consent.parseConsentRecord(JSON.stringify(record), record.expiresAt), null);
  for (const invalid of [
    null,
    '',
    '{',
    JSON.stringify({ ...record, version: 'old' }),
    JSON.stringify({ ...record, updatedAt: now + 1 }),
    JSON.stringify({ ...record, expiresAt: record.expiresAt + 1 }),
    JSON.stringify({ ...record, analytics: false, advertising: true }),
  ])
    assert.equal(consent.parseConsentRecord(invalid, now), null);
});

test('Consent matrix separates Analytics and Ads measurement; personalisation is always denied', () => {
  assert.deepEqual(consent.consentSignals(allow), { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
  assert.deepEqual(consent.consentSignals({ analytics: true, advertising: false }), { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  assert.deepEqual(consent.consentSignals({ analytics: false, advertising: true }), consent.consentSignals(deny));
  const rejection = consent.makeConsentRecord(deny);
  assert.deepEqual(consent.resolveConsent('outside', rejection), deny);
  assert.deepEqual(consent.resolveConsent('outside', null), allow);
  assert.deepEqual(consent.resolveConsent('outside', null, true), deny);
});

test('Required/unknown regions never load or initialize GA or queue contact clicks before a choice', async (t) => {
  for (const region of ['required', 'unknown']) {
    const f = fixture(t, region);
    await f.controller.start();
    f.click();
    f.click('mailto:info@diputrasignature.com?body=Private');
    assert.equal(f.state().needsChoice, true);
    assert.equal(f.state().loadTag, false);
    assert.equal(f.target.dsiGoogleAnalyticsInitialized, undefined);
    assert.equal(f.doc.cookieWrites.length, 0);
    assert.deepEqual(f.events(), []);
    assert.ok(!f.commands().some(([command]) => ['event', 'config', 'js'].includes(command)));
    assert.equal(f.fetches.length, 1);
    assert.equal(f.fetches[0].url, '/api/consent-region');
    assert.equal(f.fetches[0].init.cache, 'no-store');
  }
});

test('Geolocation transport, HTTP and malformed-response failures all fail closed', async (t) => {
  for (const fetch of [
    async () => {
      throw new Error('offline');
    },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ region: 'allow' }) }),
  ]) {
    const f = fixture(t);
    f.target.fetch = fetch;
    await f.controller.start();
    assert.equal(f.state().region, 'unknown');
    assert.equal(f.state().needsChoice, true);
    assert.equal(f.state().loadTag, false);
  }
});

test('A slow geolocation lookup times out to the protected unknown region', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture(t);
  f.target.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  const started = f.controller.start();
  t.mock.timers.tick(3001);
  await started;
  assert.equal(f.state().loadTag, false);
  assert.equal(f.state().needsChoice, true);
});

test('Outside-region defaults preserve tracking without storing an invented acceptance or granting personalisation', async (t) => {
  const f = fixture(t, 'outside');
  await f.controller.start();
  assert.equal(f.state().loadTag, true);
  assert.equal(f.state().needsChoice, false);
  assert.equal(f.target.localStorage.getItem(consent.CONSENT_STORAGE_KEY), null);
  assert.deepEqual(f.events(), []);
  assert.deepEqual(
    f
      .commands()
      .filter(([command]) => command === 'consent')
      .at(-1)[2],
    consent.consentSignals(allow)
  );
  f.click();
  assert.deepEqual(f.events(), [['event', 'conversion_event_contact', { send_to: 'G-35HJ3QBMKJ' }]]);
});

test('Accept sends default/update before measurement, never replays earlier clicks and never duplicates config', async (t) => {
  const f = fixture(t);
  await f.controller.start();
  f.click();
  f.controller.save(allow);
  assert.equal(f.state().loadTag, true);
  assert.deepEqual(f.events(), []);
  const commands = f.commands();
  assert.deepEqual(commands[0], ['consent', 'default', consent.consentSignals(deny)]);
  const granted = commands.findIndex(([command, operation, value]) => command === 'consent' && operation === 'update' && value.analytics_storage === 'granted');
  assert.ok(granted < commands.findIndex(([command]) => command === 'config'));
  f.click();
  f.click('mailto:info@diputrasignature.com?body=Private');
  f.controller.save(allow);
  assert.equal(f.events().length, 2);
  assert.equal(f.commands().filter(([command]) => command === 'config').length, 1);
  assert.doesNotMatch(JSON.stringify(f.events()), /Private|mailto|wa\.me|info@/);
});

test('Reject is persisted and remains effective after reload into another region', async (t) => {
  const first = fixture(t);
  await first.controller.start();
  first.controller.save(deny);
  first.click();
  assert.equal(first.state().needsChoice, false);
  assert.equal(first.state().loadTag, false);
  const second = fixture(t, 'outside', { raw: first.target.localStorage.getItem(consent.CONSENT_STORAGE_KEY) });
  await second.controller.start();
  second.click();
  assert.equal(second.state().loadTag, false);
  assert.equal(second.state().record.analytics, false);
  assert.deepEqual(second.events(), []);
});

test('Analytics-only permits page measurement but excludes contact conversions and Ads consent', async (t) => {
  const f = fixture(t);
  await f.controller.start();
  f.controller.save({ analytics: true, advertising: false });
  assert.equal(f.state().loadTag, true);
  f.click();
  assert.deepEqual(f.events(), []);
  assert.equal(f.target.dsiContactMeasurementAllowed, false);
  f.controller.save(allow);
  assert.deepEqual(f.events(), []);
  f.click();
  assert.equal(f.events().length, 1);
  assert.equal(f.commands().filter(([command]) => command === 'config').length, 1);
});

test('Withdrawing suspends clicks synchronously, updates denied, deletes known cookies and reloads', async (t) => {
  const f = fixture(t);
  await f.controller.start();
  f.controller.save(allow);
  f.doc.cookies = new Map([
    ['_ga', 'id'],
    ['_ga_35HJ3QBMKJ', 'session'],
    ['_gcl_au', 'ad'],
    ['_gac_UA', 'ad'],
    ['sb-auth-token', 'keep'],
    ['unrelated', 'keep'],
  ]);
  f.click();
  f.controller.save(deny);
  assert.equal(f.target[analytics.GOOGLE_ANALYTICS_OPT_OUT], true);
  assert.equal(f.state().reloadRequired, true);
  assert.equal(f.state().loadTag, false);
  assert.equal(f.target.reloads, 1);
  assert.deepEqual(
    f
      .commands()
      .filter(([command]) => command === 'consent')
      .at(-1)[2],
    consent.consentSignals(deny)
  );
  f.click();
  assert.equal(f.events().length, 1);
  assert.deepEqual([...f.doc.cookies.keys()], ['sb-auth-token', 'unrelated']);
  assert.ok(f.doc.cookieWrites.some((value) => value.includes('domain=.diputrasignature.com')));
});

test('Withdrawing Ads only preserves Analytics cookies but reloads with Ads denied', async (t) => {
  const f = fixture(t, 'outside');
  await f.controller.start();
  f.doc.cookies = new Map([
    ['_ga', 'keep'],
    ['_gcl_aw', 'remove'],
  ]);
  f.controller.save({ analytics: true, advertising: false });
  assert.equal(f.target.reloads, 1);
  assert.deepEqual([...f.doc.cookies.keys()], ['_ga']);
  const second = fixture(t, 'outside', { raw: f.target.localStorage.getItem(consent.CONSENT_STORAGE_KEY) });
  await second.controller.start();
  assert.equal(second.state().loadTag, true);
  assert.equal(second.target.dsiContactMeasurementAllowed, false);
});

test('Expired, invalid or old-version choices require renewal even outside the coverage area', async (t) => {
  const expired = consent.makeConsentRecord(allow, Date.now() - consent.CONSENT_MAX_AGE_MS - 1000);
  for (const raw of ['{', JSON.stringify(expired), JSON.stringify({ ...consent.makeConsentRecord(allow), version: 'old' })]) {
    const f = fixture(t, 'outside', { raw });
    await f.controller.start();
    assert.equal(f.state().needsChoice, true);
    assert.equal(f.state().loadTag, false);
  }
});

test('Storage failure stays protected and preserves an in-memory rejection in this document', async (t) => {
  const f = fixture(t, 'outside');
  Object.defineProperty(f.doc, 'cookie', {
    get: () => '',
    set: () => {
      throw new Error('Cookies blocked');
    },
  });
  f.target.localStorage.getItem = () => {
    throw new Error('blocked');
  };
  f.target.localStorage.setItem = () => {
    throw new Error('blocked');
  };
  await f.controller.start();
  assert.equal(f.state().loadTag, false);
  f.controller.save(deny);
  f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.state().loadTag, false);
  assert.equal(f.state().storageFailed, true);
});

test('Essential fallback cookie persists a withdrawal when localStorage writes fail with an older grant', async (t) => {
  const oldGrant = consent.makeConsentRecord(allow, Date.now() - 1000);
  const f = fixture(t, 'outside', { raw: JSON.stringify(oldGrant) });
  await f.controller.start();
  f.target.localStorage.setItem = () => {
    throw new Error('Storage quota');
  };
  f.controller.save(deny);
  assert.equal(f.target.reloads, 1);
  assert.equal(f.state().storageFailed, false);
  const second = fixture(t, 'outside', { raw: JSON.stringify(oldGrant) });
  second.doc.cookies = new Map(f.doc.cookies);
  await second.controller.start();
  assert.equal(second.state().loadTag, false);
  assert.equal(second.state().record.analytics, false);
});

test('No new grants can start measurement while the country lookup is still pending', async (t) => {
  const f = fixture(t);
  let finish;
  f.target.fetch = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const started = f.controller.start();
  f.controller.save(allow);
  assert.equal(f.state().loadTag, false);
  assert.equal(f.target.dsiGoogleAnalyticsInitialized, undefined);
  finish({ ok: true, json: async () => ({ region: 'required' }) });
  await started;
  assert.equal(f.state().loadTag, true);
});

test('Initial protected visits remove old accessible measurement cookies but preserve essential cookies', async (t) => {
  const f = fixture(t);
  f.doc.cookies = new Map([
    ['_ga', 'old'],
    ['_gcl_aw', 'old'],
    ['sb-auth-token', 'keep'],
  ]);
  await f.controller.start();
  assert.deepEqual([...f.doc.cookies.keys()], ['sb-auth-token']);
  assert.ok(f.doc.cookieWrites.every((value) => value.includes('Max-Age=0')));
  assert.equal(f.state().loadTag, false);
});

test('A broken Google command function cannot block the consent interface or native contact actions', async (t) => {
  const f = fixture(t);
  f.target.gtag = () => {
    throw new Error('External tag unavailable');
  };
  await f.controller.start();
  assert.equal(f.state().resolved, true);
  assert.equal(f.state().needsChoice, true);
  assert.doesNotThrow(() => f.controller.save(allow));
  assert.equal(f.state().loadTag, false);
  assert.equal(f.target[analytics.GOOGLE_ANALYTICS_OPT_OUT], true);
  f.click();
  assert.deepEqual(f.events(), []);
});

test('Cross-tab rejection and open-tab expiry stop already active tracking', async (t) => {
  const f = fixture(t, 'outside');
  await f.controller.start();
  f.target.values.set(consent.CONSENT_STORAGE_KEY, JSON.stringify(consent.makeConsentRecord(deny)));
  const storage = new Event('storage');
  Object.assign(storage, { key: consent.CONSENT_STORAGE_KEY, newValue: f.target.values.get(consent.CONSENT_STORAGE_KEY) });
  f.target.dispatchEvent(storage);
  assert.equal(f.target.reloads, 1);
  const record = consent.makeConsentRecord(allow);
  const second = fixture(t, 'required', { raw: JSON.stringify(record) });
  await second.controller.start();
  t.mock.method(Date, 'now', () => record.expiresAt + 1);
  second.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(second.target.reloads, 1);
  assert.equal(second.state().loadTag, false);
});

test('Development/Preview/private paths cannot start Google measurement even after explicit acceptance', async (t) => {
  for (const options of [{ enabled: false }, { host: 'localhost' }, { host: 'preview.vercel.app' }, { host: 'diputrasignature.com.evil.test' }]) {
    const f = fixture(t, 'outside', options);
    await f.controller.start();
    f.controller.save(allow);
    assert.equal(f.state().loadTag, false);
    assert.equal(f.target.dataLayer, undefined);
  }
  const f = fixture(t, 'outside');
  f.target.location.pathname = '/admin/dashboard';
  await f.controller.start();
  assert.equal(f.state().loadTag, false);
});

test('Cleanup prevents stale geo results and duplicate handlers after remounts', async (t) => {
  const f = fixture(t);
  let resolve;
  f.target.fetch = () =>
    new Promise((done) => {
      resolve = done;
    });
  const started = f.controller.start();
  f.controller.dispose();
  resolve({ ok: true, json: async () => ({ region: 'outside' }) });
  await started;
  assert.equal(f.target.dsiGoogleAnalyticsInitialized, undefined);
  const states = [];
  const next = runtime.createConsentController(f.target, f.doc, true, (state) => states.push(state));
  f.target.fetch = async () => ({ ok: true, json: async () => ({ region: 'outside' }) });
  t.after(() => next.dispose());
  await next.start();
  f.click();
  assert.equal(f.events().length, 1);
  assert.equal(f.commands().filter(([command]) => command === 'config').length, 1);
});

test('Banner exposes equal accept/reject actions and links a real policy route; optional choices start unchecked', () => {
  const { SiteCookieConsent } = compile('src/components/layout/site-cookie-consent.tsx', {
    '@/lib/site-consent': consent,
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    'lucide-react': { X: () => null },
    react: { useState: (initial) => [initial, () => {}], useRef: () => ({ current: null }), useEffect: () => {} },
  });
  const html = renderToStaticMarkup(React.createElement(SiteCookieConsent, { consent: { ...runtime.INITIAL_CONSENT, resolved: true, needsChoice: true }, onSave: () => {} }));
  for (const label of ['Accept all', 'Reject non-essential', 'Manage preferences']) assert.ok(html.includes(label));
  assert.match(html, /href="\/cookie-policy"/);
  assert.match(source('src/components/layout/site-cookie-consent.tsx'), /consent\.record \?\? NO_CONSENT/);
  assert.doesNotMatch(source('src/components/layout/site-cookie-consent.tsx'), /defaultChecked/);
  assert.ok(source('src/app/(site)/cookie-policy/page.tsx').includes('Cookie Policy'));
  assert.ok(source('src/components/layout/site-footer.tsx').includes('CookiePreferencesButton'));
});
