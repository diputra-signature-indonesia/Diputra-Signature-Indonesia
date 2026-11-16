import { applySiteConsent, GOOGLE_ANALYTICS_OPT_OUT, initializeSiteAnalytics, isAnalyticsProductionHost, isPublicAnalyticsPath, type AnalyticsWindow } from './site-analytics';
import { attachContactClickTracking } from './site-contact-tracking';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_MS,
  CONSENT_STORAGE_KEY,
  makeConsentRecord,
  NO_CONSENT,
  parseConsentRecord,
  resolveConsent,
  type ConsentPreferences,
  type ConsentRecord,
  type ConsentRegion,
} from './site-consent';

export type ConsentSnapshot = {
  resolved: boolean;
  region: ConsentRegion;
  record: ConsentRecord | null;
  permissions: ConsentPreferences;
  needsChoice: boolean;
  storageFailed: boolean;
  loadTag: boolean;
  reloadRequired: boolean;
};
export const INITIAL_CONSENT: ConsentSnapshot = {
  resolved: false,
  region: 'unknown',
  record: null,
  permissions: NO_CONSENT,
  needsChoice: false,
  storageFailed: false,
  loadTag: false,
  reloadRequired: false,
};

export function clearMeasurementCookies(doc: Document, location: Location, preferences: ConsentPreferences) {
  const names = doc.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter(Boolean);
  const domains = [
    '',
    ...location.hostname
      .split('.')
      .map((_, index, parts) => parts.slice(index).join('.'))
      .filter((domain) => domain.includes('.'))
      .flatMap((domain) => [domain, '.' + domain]),
  ];
  const paths = new Set(['/']);
  const segments = location.pathname.split('/').filter(Boolean);
  for (let index = 1; index <= segments.length; index++) {
    const path = '/' + segments.slice(0, index).join('/');
    paths.add(path);
    paths.add(path + '/');
  }
  for (const name of names) {
    const analytics = /^(_ga(?:_|$)|_gid$|_gat(?:_|$))/.test(name);
    const advertising = /^(_gcl_|_gac_)/.test(name);
    if ((!preferences.analytics && analytics) || (!preferences.advertising && advertising)) {
      for (const domain of domains)
        for (const path of paths) {
          doc.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? '; domain=' + domain : ''}`;
        }
    }
  }
}

// All external effects are injectable for controlled tests; no public geo override exists.
export function createConsentController(target: Window & AnalyticsWindow, doc: Document, trackingEnabled: boolean, notify: (state: ConsentSnapshot) => void) {
  let snapshot = { ...INITIAL_CONSENT };
  let disposed = false;
  let locked = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let detachContacts: (() => void) | undefined;
  let memoryRecord: ConsentRecord | null = null;
  const abort = new AbortController();
  const canTrack = () => trackingEnabled && isAnalyticsProductionHost(target.location.hostname) && isPublicAnalyticsPath(target.location.pathname);
  const pauseTracking = () => {
    target.dsiAnalyticsAllowed = false;
    target.dsiContactMeasurementAllowed = false;
    target[GOOGLE_ANALYTICS_OPT_OUT] = true;
  };
  const emit = () => {
    if (!disposed) notify(snapshot);
  };
  const readCookie = () => {
    try {
      const value = doc.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(CONSENT_COOKIE_NAME + '='))
        ?.slice(CONSENT_COOKIE_NAME.length + 1);
      return value ? decodeURIComponent(value) : null;
    } catch {
      return null;
    }
  };
  const readChoice = () => {
    const cookieRaw = readCookie();
    const cookieRecord = parseConsentRecord(cookieRaw);
    try {
      const raw = target.localStorage.getItem(CONSENT_STORAGE_KEY);
      const stored = parseConsentRecord(raw);
      const record = memoryRecord ? parseConsentRecord(JSON.stringify(memoryRecord)) : cookieRecord && (!stored || cookieRecord.updatedAt >= stored.updatedAt) ? cookieRecord : stored;
      return { record, needsRenewal: (raw !== null || cookieRaw !== null || memoryRecord !== null) && !record, storageFailed: memoryRecord !== null };
    } catch {
      return { record: memoryRecord ? parseConsentRecord(JSON.stringify(memoryRecord)) : cookieRecord, needsRenewal: true, storageFailed: !cookieRecord };
    }
  };

  function reconcile(choice = readChoice()) {
    if (disposed || locked) return;
    clearTimeout(expiryTimer);
    const permissions = resolveConsent(snapshot.region, choice.record, choice.needsRenewal);
    const reduction = (snapshot.permissions.analytics && !permissions.analytics) || (snapshot.permissions.advertising && !permissions.advertising);
    // A loaded Google script can send automatic events even after its DOM node is
    // removed. On withdrawal, suspend first, update consent, clear cookies, reload.
    const reloadRequired = canTrack() && !!target.dsiGoogleAnalyticsInitialized && reduction;
    locked = reloadRequired;
    snapshot = { ...snapshot, ...choice, permissions, needsChoice: !choice.record && (snapshot.region !== 'outside' || choice.needsRenewal), reloadRequired, loadTag: false };
    if (canTrack()) {
      try {
        applySiteConsent(target, permissions, reloadRequired);
        clearMeasurementCookies(doc, target.location, permissions);
        if (!reloadRequired && permissions.analytics) {
          initializeSiteAnalytics(target);
          snapshot.loadTag = true;
          detachContacts ??= attachContactClickTracking(target, doc);
        }
      } catch {
        // Consent UI and native navigation remain usable if Google or cookie APIs fail.
        snapshot.loadTag = false;
        pauseTracking();
      }
    }
    emit();
    if (choice.record) expiryTimer = setTimeout(() => reconcile(), Math.min(choice.record.expiresAt - Date.now(), 2_147_483_647));
    if (reloadRequired) {
      detachContacts?.();
      detachContacts = undefined;
      // Reload cannot recall requests already sent before the withdrawal.
      if (!choice.storageFailed)
        try {
          target.location.reload();
        } catch {
          /* Remain suspended if reload fails. */
        }
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (!snapshot.resolved) return;
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
      memoryRecord = null;
      if (event.newValue === null) reconcile({ record: null, needsRenewal: true, storageFailed: false });
      else reconcile();
    }
  };
  const onVisible = () => {
    if (doc.visibilityState === 'visible' && snapshot.resolved) reconcile();
  };
  return {
    async start() {
      if (canTrack()) {
        try {
          applySiteConsent(target, NO_CONSENT);
        } catch {
          pauseTracking();
        }
      }
      target.addEventListener('storage', onStorage);
      doc.addEventListener('visibilitychange', onVisible);
      const timeout = setTimeout(() => abort.abort(), 3000);
      try {
        const response = await target.fetch('/api/consent-region', { cache: 'no-store', credentials: 'same-origin', signal: abort.signal });
        if (!response.ok) throw new Error('Region unavailable');
        const data = await response.json();
        snapshot.region = ['required', 'outside', 'unknown'].includes(data?.region) ? data.region : 'unknown';
      } catch {
        snapshot.region = 'unknown';
      } finally {
        clearTimeout(timeout);
      }
      if (disposed) return;
      snapshot.resolved = true;
      reconcile();
    },
    save(preferences: ConsentPreferences) {
      const record = makeConsentRecord(preferences);
      let storageFailed = false;
      try {
        target.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
        // Remove a stale fallback so a previous denial cannot override a new choice.
        try {
          doc.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax`;
        } catch {
          /* Local storage remains authoritative. */
        }
      } catch {
        // Essential preference cookie fallback protects a withdrawal if storage is full.
        try {
          const encoded = encodeURIComponent(JSON.stringify(record));
          doc.cookie = `${CONSENT_COOKIE_NAME}=${encoded}; Max-Age=${CONSENT_MAX_AGE_MS / 1000}; path=/; SameSite=Lax${target.location.protocol === 'https:' ? '; Secure' : ''}`;
          storageFailed = readCookie() !== JSON.stringify(record);
        } catch {
          storageFailed = true;
        }
      }
      memoryRecord = storageFailed ? record : null;
      if (!snapshot.resolved) {
        snapshot = { ...snapshot, record, storageFailed };
        emit();
        return;
      }
      // Choice is applied synchronously before the next contact click/navigation.
      reconcile({ record, needsRenewal: false, storageFailed });
    },
    dispose() {
      disposed = true;
      abort.abort();
      clearTimeout(expiryTimer);
      target.removeEventListener('storage', onStorage);
      doc.removeEventListener('visibilitychange', onVisible);
      detachContacts?.();
      pauseTracking();
    },
  };
}

let snapshot = INITIAL_CONSENT;
const subscribers = new Set<() => void>();
let activeController: ReturnType<typeof createConsentController> | undefined;
let mounts = 0;
export const getConsentSnapshot = () => snapshot;
export const getServerConsentSnapshot = () => INITIAL_CONSENT;
export function subscribeConsent(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}
function publish(state: ConsentSnapshot) {
  snapshot = state;
  subscribers.forEach((listener) => listener());
}
export function startSiteConsent(trackingEnabled: boolean) {
  mounts += 1;
  if (!activeController) {
    activeController = createConsentController(window, document, trackingEnabled, publish);
    void activeController.start();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--mounts === 0) {
      activeController?.dispose();
      activeController = undefined;
      publish(INITIAL_CONSENT);
    }
  };
}
export function saveSiteConsent(preferences: ConsentPreferences) {
  activeController?.save(preferences);
}
