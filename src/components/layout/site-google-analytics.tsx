'use client';

import { GOOGLE_ANALYTICS_ID, GOOGLE_ANALYTICS_OPT_OUT, initializeSiteAnalytics, isAnalyticsProductionHost, isPublicAnalyticsPath, type AnalyticsWindow } from '@/lib/site-analytics';
import { attachContactClickTracking } from '@/lib/site-contact-tracking';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const serverSnapshot = () => false;
const browserSnapshot = () => isAnalyticsProductionHost(window.location.hostname);

export function SiteGoogleAnalytics() {
  const pathname = usePathname();
  const productionHost = useSyncExternalStore(subscribe, browserSnapshot, serverSnapshot);
  const enabled = productionHost && isPublicAnalyticsPath(pathname);

  useEffect(() => {
    const analyticsWindow = window as Window & AnalyticsWindow;
    let detachContactTracking: (() => void) | undefined;
    if (enabled) {
      initializeSiteAnalytics(analyticsWindow);
      detachContactTracking = attachContactClickTracking(analyticsWindow, document);
    } else analyticsWindow[GOOGLE_ANALYTICS_OPT_OUT] = true;

    // Scripts survive layout unmounts. Stop collection when leaving public pages.
    return () => {
      detachContactTracking?.();
      analyticsWindow[GOOGLE_ANALYTICS_OPT_OUT] = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  return <Script id="dsi-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`} strategy="afterInteractive" />;
}
