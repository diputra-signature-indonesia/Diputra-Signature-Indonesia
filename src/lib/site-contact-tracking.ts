import { GOOGLE_ANALYTICS_ID, GOOGLE_ANALYTICS_OPT_OUT, isAnalyticsProductionHost, isPublicAnalyticsPath, type AnalyticsWindow } from './site-analytics';

type ContactEventName = 'conversion_event_contact' | 'conversion_event_contact_1';

export function contactEventForUrl(href: string): ContactEventName | null {
  try {
    const url = new URL(href);
    if (url.protocol === 'mailto:') return 'conversion_event_contact_1';
    if (url.protocol === 'whatsapp:' && url.hostname === 'send') return 'conversion_event_contact';
    if (['https:', 'http:'].includes(url.protocol) && ['wa.me', 'www.wa.me', 'api.whatsapp.com', 'web.whatsapp.com'].includes(url.hostname)) return 'conversion_event_contact';
  } catch {
    // Invalid/relative URLs cannot be contact destinations.
  }
  return null;
}

// Reference counting keeps one handler per document, even if mounted twice.
// Each effect owns its cleanup, so Strict Mode/remounts do not leak listeners.
const subscriptions = new WeakMap<Document, { users: number; dispose: () => void }>();

export function attachContactClickTracking(target: Window & AnalyticsWindow, doc: Document) {
  let subscription = subscriptions.get(doc);
  if (!subscription) {
    const handleClick = (event: MouseEvent) => {
      // A primary/keyboard click and a middle-button auxclick are distinct actions.
      // Ignore right clicks and never count both event types for the same action.
      if (event.type === 'click' ? event.button !== 0 : event.button !== 1) return;
      try {
        // Read the current path on every click, including during SPA transitions.
        if (!isAnalyticsProductionHost(target.location.hostname) || !isPublicAnalyticsPath(target.location.pathname)) return;
        if (target[GOOGLE_ANALYTICS_OPT_OUT] === true || typeof target.gtag !== 'function') return;

        // composedPath also covers icons, text nodes and composed shadow content.
        const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof Element && node.matches('a[href]'));
        if (!anchor) return;
        const eventName = contactEventForUrl(anchor.href);
        if (!eventName) return;

        // No URL, email, phone number, link text or message enters the payload.
        // Use the existing tag/consent pipeline; never initialize or grant consent here.
        target.gtag('event', eventName, { send_to: GOOGLE_ANALYTICS_ID });
      } catch {
        // A blocked/broken tag must never interfere with the native link action.
      }
    };

    const options = { capture: true };
    doc.addEventListener('click', handleClick, options);
    doc.addEventListener('auxclick', handleClick, options);
    subscription = {
      users: 0,
      dispose: () => {
        doc.removeEventListener('click', handleClick, options);
        doc.removeEventListener('auxclick', handleClick, options);
      },
    };
    subscriptions.set(doc, subscription);
  }
  const current = subscription;
  current.users += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    current.users -= 1;
    if (current.users === 0) {
      current.dispose();
      subscriptions.delete(doc);
    }
  };
}
