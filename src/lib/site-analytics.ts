export const GOOGLE_ANALYTICS_ID = 'G-35HJ3QBMKJ';
export const GOOGLE_ANALYTICS_OPT_OUT = `ga-disable-${GOOGLE_ANALYTICS_ID}` as const;

export type AnalyticsWindow = {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  dsiGoogleAnalyticsInitialized?: boolean;
  [GOOGLE_ANALYTICS_OPT_OUT]?: boolean;
};

export function isAnalyticsProductionHost(hostname: string) {
  return hostname === 'diputrasignature.com' || hostname === 'www.diputrasignature.com';
}

export function isPublicAnalyticsPath(pathname: string) {
  return ['/', '/about', '/contact', '/services', '/blog'].includes(pathname) || pathname.startsWith('/services/') || pathname.startsWith('/blog/');
}

export function initializeSiteAnalytics(target: AnalyticsWindow) {
  target[GOOGLE_ANALYTICS_OPT_OUT] = false;
  if (target.dsiGoogleAnalyticsInitialized) return;

  target.dataLayer ??= [];
  target.gtag ??= function gtag() {
    // Google tag commands use the same arguments-object queue as its snippet.
    // eslint-disable-next-line prefer-rest-params
    target.dataLayer!.push(arguments);
  };
  target.gtag('js', new Date());
  target.gtag('config', GOOGLE_ANALYTICS_ID);
  target.dsiGoogleAnalyticsInitialized = true;
}
