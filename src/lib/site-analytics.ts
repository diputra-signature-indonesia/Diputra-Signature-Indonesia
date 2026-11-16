import { consentSignals, NO_CONSENT, type ConsentPreferences } from './site-consent';

export const GOOGLE_ANALYTICS_ID = 'G-35HJ3QBMKJ';
export const GOOGLE_ANALYTICS_OPT_OUT = `ga-disable-${GOOGLE_ANALYTICS_ID}` as const;

export type AnalyticsWindow = {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  dsiGoogleAnalyticsInitialized?: boolean;
  dsiConsentDefaultsSet?: boolean;
  dsiConsentSignals?: string;
  dsiAnalyticsAllowed?: boolean;
  dsiContactMeasurementAllowed?: boolean;
  [GOOGLE_ANALYTICS_OPT_OUT]?: boolean;
};

export function isAnalyticsProductionHost(hostname: string) {
  return hostname === 'diputrasignature.com' || hostname === 'www.diputrasignature.com';
}

export function isPublicAnalyticsPath(pathname: string) {
  return ['/', '/about', '/contact', '/services', '/blog', '/cookie-policy'].includes(pathname) || pathname.startsWith('/services/') || pathname.startsWith('/blog/');
}

function ensureGoogleQueue(target: AnalyticsWindow) {
  target.dataLayer ??= [];
  target.gtag ??= function gtag() {
    // Google tag commands use the same arguments-object queue as its snippet.
    // eslint-disable-next-line prefer-rest-params
    target.dataLayer!.push(arguments);
  };
}

export function applySiteConsent(target: AnalyticsWindow, preferences: ConsentPreferences, suspended = false) {
  target.dsiAnalyticsAllowed = preferences.analytics && !suspended;
  target.dsiContactMeasurementAllowed = preferences.analytics && preferences.advertising && !suspended;
  target[GOOGLE_ANALYTICS_OPT_OUT] = !target.dsiAnalyticsAllowed;
  ensureGoogleQueue(target);
  if (!target.dsiConsentDefaultsSet) {
    target.gtag!('consent', 'default', consentSignals(NO_CONSENT));
    target.gtag!('set', { ads_data_redaction: true, url_passthrough: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    target.dsiConsentDefaultsSet = true;
  }
  const signals = consentSignals(preferences);
  const serialized = JSON.stringify(signals);
  if (target.dsiConsentSignals !== serialized) {
    target.gtag!('consent', 'update', signals);
    target.dsiConsentSignals = serialized;
  }
}

export function initializeSiteAnalytics(target: AnalyticsWindow) {
  if (!target.dsiAnalyticsAllowed || target[GOOGLE_ANALYTICS_OPT_OUT] || !target.dsiConsentDefaultsSet || target.dsiGoogleAnalyticsInitialized) return;
  ensureGoogleQueue(target);
  target.gtag!('js', new Date());
  target.gtag!('config', GOOGLE_ANALYTICS_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  target.dsiGoogleAnalyticsInitialized = true;
}
