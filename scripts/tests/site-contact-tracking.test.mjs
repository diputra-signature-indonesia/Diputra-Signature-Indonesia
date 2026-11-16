import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function compile(path, mocks = {}, globals = {}) {
  const source = readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), code)((name) => (name in mocks ? mocks[name] : require(name)), exports, ...Object.values(globals));
  return exports;
}

// Node's EventTarget runs the real handler. Only the DOM path/anchor is modeled;
// these tests do not claim browser navigation or live GA delivery was verified.
class TestElement {
  constructor(href, target = '_blank') {
    this.href = href;
    this.target = target;
  }
  matches(selector) {
    return selector === 'a[href]' && typeof this.href === 'string';
  }
}
class TestDocument extends EventTarget {
  attached = [];
  detached = [];
  addEventListener(type, listener, capture) {
    this.attached.push({ type, capture: capture?.capture ?? capture });
    super.addEventListener(type, listener, capture);
  }
  removeEventListener(type, listener, capture) {
    this.detached.push({ type, capture: capture?.capture ?? capture });
    super.removeEventListener(type, listener, capture);
  }
}
class ContactClick extends Event {
  constructor(path, { type = 'click', button = 0, ...keys } = {}) {
    super(type, { cancelable: true, bubbles: true, composed: true });
    this.path = path;
    this.button = button;
    Object.assign(this, keys);
  }
  composedPath() {
    return this.path;
  }
}
const analytics = compile('src/lib/site-analytics.ts');
const { contactEventForUrl, attachContactClickTracking } = compile('src/lib/site-contact-tracking.ts', { './site-analytics': analytics }, { Element: TestElement });
const whatsapp = 'https://wa.me/6287851021080?text=Private%20message';
const email = 'mailto:info@diputrasignature.com?subject=Private&body=visitor%40example.com';

function fixture() {
  const doc = new TestDocument();
  const target = { location: { hostname: 'diputrasignature.com', pathname: '/' } };
  analytics.initializeSiteAnalytics(target);
  const events = () => target.dataLayer.map((args) => Array.from(args)).filter((args) => args[0] === 'event');
  const click = (href, options = {}) => {
    const anchor = new TestElement(href);
    const event = new ContactClick([new TestElement(), anchor, doc], options);
    assert.equal(doc.dispatchEvent(event), true, 'Link default action must remain allowed');
    assert.equal(event.defaultPrevented, false);
    assert.equal(anchor.href, href);
    assert.equal(anchor.target, '_blank');
    return event;
  };
  return { doc, target, events, click };
}

test('Contact URL classification uses exact event names and exact WhatsApp destinations', () => {
  for (const href of [
    whatsapp,
    'https://wa.me/+6287851021080',
    'https://www.wa.me/6287851021080',
    'https://api.whatsapp.com/send?phone=6287851021080',
    'https://web.whatsapp.com/send?phone=6287851021080',
    'whatsapp://send?phone=6287851021080',
  ]) {
    assert.equal(contactEventForUrl(href), 'conversion_event_contact', href);
  }
  for (const href of [email, 'MAILTO:info@diputrasignature.com', 'mailto:']) assert.equal(contactEventForUrl(href), 'conversion_event_contact_1', href);
  for (const href of [
    '/contact',
    'https://diputrasignature.com/contact',
    'tel:+6287851021080',
    'https://wa.me.attacker.test/',
    'https://api.whatsapp.com.attacker.test/send',
    'https://wa.me@attacker.test/',
    'https://example.com/?url=https://wa.me/123',
    'javascript:alert(1)',
    '',
    'not a URL',
  ]) {
    assert.equal(contactEventForUrl(href), null, href);
  }
});

test('Mounting and visiting pages never sends a contact event or reconfigures GA', () => {
  const { doc, target, events, click } = fixture();
  const original = target.dataLayer.slice();
  const release = attachContactClickTracking(target, doc);
  target.location.pathname = '/contact';
  click('https://diputrasignature.com/contact');
  click('tel:+6287851021080');
  assert.deepEqual(events(), []);
  assert.deepEqual(target.dataLayer, original);
  release();
});

test('One WhatsApp click and one email click send only their own event to the supplied GA4 stream', () => {
  const { doc, target, events, click } = fixture();
  const release = attachContactClickTracking(target, doc);
  click(whatsapp);
  click(email);
  assert.deepEqual(events(), [
    ['event', 'conversion_event_contact', { send_to: 'G-35HJ3QBMKJ' }],
    ['event', 'conversion_event_contact_1', { send_to: 'G-35HJ3QBMKJ' }],
  ]);
  assert.doesNotMatch(JSON.stringify(events()), /Private|visitor|info@|628785|mailto|wa\.me|link_url|link_text|ads_conversion_Contact_Us_1/);
  release();
});

test('Delegation covers nested icon/text targets, dynamic anchors and SPA navigation', () => {
  const { doc, target, events } = fixture();
  const release = attachContactClickTracking(target, doc);
  for (const pathname of ['/', '/about', '/contact', '/services/visa', '/services/legal/corporate-business', '/blog/news']) {
    target.location.pathname = pathname;
    // The anchor does not exist when the listener is installed.
    const anchor = new TestElement(whatsapp);
    const event = new ContactClick([{ nodeType: 3 }, new TestElement(), anchor, doc]);
    doc.dispatchEvent(event);
  }
  assert.equal(events().length, 6);
  assert.equal(target.dataLayer.filter((args) => args[0] === 'config').length, 1);
  assert.deepEqual(doc.attached, [
    { type: 'click', capture: true },
    { type: 'auxclick', capture: true },
  ]);
  release();
});

test('Multiple mounts share the same handlers; cleanup and Strict Mode remounts do not duplicate clicks', () => {
  const { doc, target, events, click } = fixture();
  const first = attachContactClickTracking(target, doc);
  const second = attachContactClickTracking(target, doc);
  assert.equal(doc.attached.length, 2, 'One handler registration per event type');
  click(whatsapp);
  assert.equal(events().length, 1);
  first();
  first();
  click(whatsapp);
  assert.equal(events().length, 2, 'Second mount remains active');
  second();
  click(email);
  assert.equal(events().length, 2, 'No callbacks after final cleanup');
  assert.equal(doc.detached.length, 2);
  const remount = attachContactClickTracking(target, doc);
  click(email);
  assert.equal(events().length, 3);
  remount();
});

test('Keyboard, Ctrl/Meta and middle click preserve native link behavior; right clicks are ignored', () => {
  const { doc, target, events, click } = fixture();
  const release = attachContactClickTracking(target, doc);
  click(whatsapp, { detail: 0 }); // Keyboard activation generates a primary click.
  click(whatsapp, { ctrlKey: true });
  click(email, { metaKey: true });
  click(whatsapp, { button: 1 }); // Only auxclick should count a middle click.
  click(whatsapp, { type: 'auxclick', button: 1 });
  click(whatsapp, { type: 'auxclick', button: 2 });
  assert.equal(events().length, 4);
  release();
});

test('Each separate click counts once, without time-based suppression', () => {
  const { doc, target, events, click } = fixture();
  const release = attachContactClickTracking(target, doc);
  click(whatsapp);
  click(whatsapp);
  assert.equal(events().length, 2);
  release();
});

test('Current private routes, nonproduction hosts and GA opt-out cannot send contact events', () => {
  const { doc, target, events, click } = fixture();
  const release = attachContactClickTracking(target, doc);
  for (const pathname of ['/admin/dashboard', '/login', '/auth/callback', '/access-request', '/review-request/token']) {
    target.location.pathname = pathname;
    click(whatsapp);
  }
  target.location.pathname = '/';
  for (const hostname of ['localhost', '127.0.0.1', 'preview.vercel.app']) {
    target.location.hostname = hostname;
    click(email);
  }
  target.location.hostname = 'diputrasignature.com';
  target[analytics.GOOGLE_ANALYTICS_OPT_OUT] = true;
  click(whatsapp);
  assert.equal(target[analytics.GOOGLE_ANALYTICS_OPT_OUT], true);
  assert.deepEqual(events(), []);
  release();
});

test('Missing or throwing gtag never blocks native actions, retries, initializes or loads another tag', () => {
  const { doc, target, events, click } = fixture();
  const release = attachContactClickTracking(target, doc);
  const initialCommands = target.dataLayer.slice();
  delete target.gtag;
  click(email);
  assert.equal(target.gtag, undefined);
  let attempts = 0;
  target.gtag = () => {
    attempts += 1;
    throw new Error('Tag blocked');
  };
  click(whatsapp);
  assert.equal(attempts, 1);
  assert.deepEqual(events(), []);
  assert.deepEqual(target.dataLayer, initialCommands);
  release();
});

test('When the external loader is blocked, clicks only use the existing queue and leave consent untouched', () => {
  const { doc, target, events, click } = fixture();
  target.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' });
  const consentBefore = target.dataLayer.filter((args) => args[0] === 'consent');
  const gtagBefore = target.gtag;
  const release = attachContactClickTracking(target, doc);
  click(whatsapp);
  click(email);
  assert.equal(target.gtag, gtagBefore);
  assert.equal(events().length, 2, 'Queued commands are not proof of Google delivery');
  assert.deepEqual(
    target.dataLayer.filter((args) => args[0] === 'consent'),
    consentBefore
  );
  assert.equal(target.dataLayer.filter((args) => args[0] === 'config').length, 1);
  release();
});
