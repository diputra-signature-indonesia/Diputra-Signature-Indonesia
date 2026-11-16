'use client';

import { GOOGLE_ANALYTICS_ID } from '@/lib/site-analytics';
import { getConsentSnapshot, getServerConsentSnapshot, saveSiteConsent, startSiteConsent, subscribeConsent } from '@/lib/site-consent-runtime';
import Script from 'next/script';
import { useEffect, useSyncExternalStore } from 'react';
import { SiteCookieConsent } from './site-cookie-consent';

export function SiteGoogleAnalytics({ trackingEnabled = false }: { trackingEnabled?: boolean }) {
  const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
  useEffect(() => startSiteConsent(trackingEnabled), [trackingEnabled]);
  return (
    <>
      <SiteCookieConsent consent={consent} onSave={saveSiteConsent} />
      {consent.loadTag ? <Script id="dsi-google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`} strategy="afterInteractive" /> : null}
    </>
  );
}
