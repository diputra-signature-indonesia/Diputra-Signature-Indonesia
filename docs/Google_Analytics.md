# Google Analytics 4

Measurement ID: `G-35HJ3QBMKJ` (a public identifier, not a secret).

The public `(site)` layout mounts the Google tag through `next/script` with
`afterInteractive`. No additional npm package, database change, or environment
variable is required. Layout, H1s, metadata and existing UI remain unchanged.

## Scope

- Production builds on `diputrasignature.com` / `www.diputrasignature.com` only.
- Vercel Preview/development builds and localhost do not load the tag.
- Home, About, Contact, Services and Blog (including child pages) are tracked.
- Admin, login/auth, access requests and private review-token pages do not mount
  the tag. Leaving the public layout enables Google's `ga-disable` flag because
  an already downloaded third-party script can survive client-side navigation.
- The dataLayer/gtag bootstrap is idempotent across remounts and React Strict
  Mode. Existing dataLayer/gtag values are preserved.

## Pageviews and account settings

The config command sends the initial pageview. Further client-side pageviews
use GA4 Enhanced Measurement's History API tracking; the app deliberately does
not send additional manual `page_view` events that would double-count them.

In GA Admin → Data streams → this web stream → Enhanced measurement → Page views
→ advanced settings, enable **Page changes based on browser history events**.
This setting belongs to the Analytics account and cannot be verified from the
repository. Do not add a second copy of the snippet or a duplicate GTM GA tag.

After deployment, verify using GA Realtime / Tag Assistant while visiting the
Production domain and navigating between public pages. Browser ad blockers or
tracking protections can block collection. Local/Preview intentionally do not
send visits, so they cannot confirm live delivery to the Analytics property.

No cookie-consent UI or consent-management platform was added by this change.
Consent/privacy-policy integration, if needed, remains a separate requirement.
Automated tests mock Google commands and do not send live Analytics hits.

References:

- [Next.js script loading](https://nextjs.org/learn/seo/third-party-scripts)
- [Google SPA measurement](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Google Analytics opt-out flag](https://developers.google.com/tag-platform/security/guides/privacy)
