# Google Analytics 4

Measurement ID: `G-35HJ3QBMKJ` (a public identifier, not a secret).

The public `(site)` layout mounts the regional consent interface. It loads the
existing Google tag through `next/script` with `afterInteractive` only when the
regional decision and preferences permit Analytics. No additional npm package,
database change or environment variable is required. See [Regional consent](Site_Consent.md)
for the current behavior, consent matrix, technical policy notice and release checks.

## Scope

- Production builds on `diputrasignature.com` / `www.diputrasignature.com` only.
- Vercel Preview/development builds and localhost do not load the tag.
- Home, About, Contact, Services, Blog and Cookie Policy are eligible for tracking
  according to the regional decision and stored choice.
- Admin, login/auth, access requests and private review-token pages do not mount
  the tag. Leaving the public layout enables Google's `ga-disable` flag because
  an already downloaded third-party script can survive client-side navigation.
- The dataLayer/gtag bootstrap is idempotent across remounts and React Strict
  Mode. Existing dataLayer/gtag values are preserved.

## Pageviews and account settings

After permission, the config command sends the initial pageview. Further client-side pageviews
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

An English banner and Google Consent Mode v2 now implement Basic Consent Mode
for the EEA, UK, Switzerland and unknown locations. Other regions retain existing
tracking defaults, while explicit rejections are respected everywhere. Ad
personalisation remains denied. A complete organization-approved Privacy Policy
is still needed; the new `/cookie-policy` page describes the technical implementation.
Automated tests mock Google commands and do not send live Analytics hits.

## Contact conversions (2026-11-16)

The website continues to use the existing **direct GA4 installation** with
`G-35HJ3QBMKJ`. No GTM container, second loader, initialization, manual pageview,
Google Ads `AW-` ID or conversion label was added. The user confirmed that the
GA4 tag drafted in `GTM-54MX5TWJ` has not been published. Keep that draft
unpublished while this direct implementation is in use.

| Contact action       | Google Ads display name | Exact GA4 event              |
| -------------------- | ----------------------- | ---------------------------- |
| WhatsApp link click  | WhatsApp Click          | `conversion_event_contact`   |
| `mailto:` link click | Email Click             | `conversion_event_contact_1` |

Each command is `gtag('event', eventName, { send_to: 'G-35HJ3QBMKJ' })`.
Contact conversions now require both Analytics and advertising-measurement
permission; clicks before permission are dropped, never queued or replayed.
The destination is explicit; there is no parallel GTM custom event. The property
name **Website Diputra Signature Indonesia** and the conversion imports were
supplied by the user. Their account settings and property/stream association
have not been independently inspected.

`src/lib/site-contact-tracking.ts` handles clicks at document level. Existing
links in `site-footer.tsx`, `section-contact.tsx`, and `home-floating-contact.tsx`
(including its dynamic announcement) need no separate handlers. Header links
currently go to `/contact`, which is not a conversion; any actual WhatsApp or
email anchor added to the header will be covered automatically. Anchors added
after SPA navigation or rendered from content are also covered.

- Supported destinations: HTTP(S) `wa.me`, `www.wa.me`, `api.whatsapp.com`,
  `web.whatsapp.com`, `whatsapp://send`, and `mailto:`. Hostname matching is
  exact, so lookalike hosts or URLs containing WhatsApp in a query do not count.
- One handler per document/event type is shared across mounts. Primary clicks
  (including keyboard and Ctrl/Meta clicks) and middle-button `auxclick` are
  handled separately; right clicks are ignored. Cleanup is idempotent and
  removes handlers after the last subscription ends.
- There are no contact commands on page load, hover, announcement opening, form
  submission, `/contact` navigation, `tel:` clicks or other links. The legacy
  `ads_conversion_Contact_Us_1` event is not used or changed.
- No `preventDefault`, callback navigation, waiting timeout, retry or
  `window.open` is added. `href`, `target`, and native app opening are untouched.
  If `gtag` is missing/throws, the native action still proceeds. If the loader
  is blocked, commands may remain in its existing queue without delivery; they
  are not retried by this code.
- The conversion payload contains only `send_to`. It does not include the link
  URL/text, phone number, email address, visitor details, subject or message.
  Standard GA metadata and existing Enhanced Measurement remain unchanged.
  An automatic outbound `click` event is separate from these conversion names.
- The existing Production/public-route gates remain. The handler also checks
  the current hostname/path and the `ga-disable` flag at click time, including
  during transitions to private routes.
- The consent controller sets all four Consent Mode v2 defaults to denied before
  any Google tag is loaded, then updates them according to the regional decision
  and explicit preferences. See [Site_Consent.md](Site_Consent.md) for storage,
  withdrawal, cookie cleanup and current verification limits.

### Local verification and limits

Node tests exercise the event handler using Node EventTarget with modeled DOM
paths/anchors, the existing queue, and mocked Google commands. They cover exact
mapping/routing, nested/dynamic links and SPA paths, repeated mounts and cleanup,
no contact event on page load, no custom personal data, native-action
preservation, modifiers/middle click, private routes, opt-out, and blocked or
throwing tags. Component tests check that the existing Analytics component
attaches and detaches the handler only when enabled.

Initial contact-tracking checks (before the regional-consent implementation):

- `node --test scripts/tests/*.test.mjs`: **118 passed**, including 10 new
  contact-tracking tests and the updated Analytics component tests.
- `npx tsc --noEmit --incremental false`: passed.
- ESLint and Prettier on the changed source/tests/docs: passed.
- `git diff --check`: passed.
- Initial `npm run build` attempt: prerendering failed because the configured
  local Supabase at `127.0.0.1:54321` refused connections while Docker was
  unavailable.
- Build recheck on 2026-11-16: Docker and the existing local Supabase stack were
  running and healthy; the local Data API returned HTTP 200. The resolved app
  configuration used `http://127.0.0.1:54321` and `http://localhost:3000`.
  `npm run build` then **passed**, including compilation, TypeScript and all
  **47/47** generated pages, using Node.js 22.23.4 and Next.js 16.4.3. The existing
  middleware-to-proxy deprecation warning remains non-blocking.
- No database reset, seeding, migration, environment-file change, switch to
  Production data, or prerender/error-handling workaround was needed.

The subsequent regional-consent change passed **141 tests** and a **49/49 page**
build. See [Site_Consent.md](Site_Consent.md) for current scope, HTTP checks and
the still-unverified real-browser/GA4 checks.

These are **not real-browser tests**. No browser automation, Tag Assistant
session, GA4 DebugView inspection, live event delivery, Google Ads import
verification, GTM publishing, campaign activation or deployment was performed
as part of this implementation. No claim of successful GA4 receipt is made.

### Deployment handoff

The code is ready for deployment verification and was prepared on local `main`.
No Git push or deployment was performed during implementation and build
verification. The project documentation uses GitHub and Vercel, and its history
includes `dev` pull requests into `main`. The actual Vercel Production Branch
and dashboard settings have not been independently verified.

1. Review and commit scoped tracking/consent files, including the region endpoint,
   consent controller/banner, footer controls, Cookie Policy, tests and documentation.
   The original five contact-tracking files were committed in `37d10ae`; regional
   consent is a subsequent change for review. Keep `.env`,
   `.env.local`, backups, dependencies and build outputs out of the commit.
   If continuing the `dev` -> `main` review workflow, carry the change onto the
   working branch before committing; do not overwrite the local changes.
2. Push the working branch and review/merge its PR into the Vercel project's
   configured Production Branch (confirm that this is `main`). A Preview can
   check the website, but Analytics is intentionally disabled on Preview hosts
   and Vercel Preview builds, so it cannot prove live contact event delivery.
3. Use the existing Vercel Git deployment flow. Confirm the Production build
   succeeds with the existing Production Supabase URL/keys and site URL for
   `https://diputrasignature.com`, rather than the local environment. This
   tracking change needs no new environment variable, package or DB migration.
   Do not upload `.env.local` or deploy the locally generated `.next` output;
   the local build embeds local configuration/data and is validation only.
4. Run the manual acceptance test below on the deployed canonical domain.
   Record GA4 receipt separately from build readiness. Do not publish the GTM
   draft or activate an Ads campaign as part of this release.

### Manual acceptance test after deployment

First run the regional consent acceptance matrix in [Site_Consent.md](Site_Consent.md).
For the positive contact-event checks below, allow both optional categories when
the banner is displayed. Do not bypass consent to obtain a test event.

1. Use a Production deployment on `https://diputrasignature.com` (or `www`).
   Localhost, development and Vercel Preview intentionally do not load Analytics.
   In GA Admin > Data streams, verify that the web stream in **Website Diputra
   Signature Indonesia** has Measurement ID `G-35HJ3QBMKJ`.
2. Open [Tag Assistant](https://tagassistant.google.com/), choose **Add domain**,
   enter the Production URL, and **Connect**. Confirm the destination is
   `G-35HJ3QBMKJ`. There should be one direct tag installation; do not publish
   the GTM draft to perform this test. Inspect existing GA generated/modified
   events and Google tag event rules: neither contact name should also be
   derived from automatic `click` or `page_view`, otherwise account rules could
   duplicate the direct event. Preserve unrelated rules/tracking.
3. Open Home and `/contact` without clicking contact links. Neither
   `conversion_event_contact` nor `conversion_event_contact_1` should appear.
   Repeat after navigating to About and a service through the site header.
4. Click each available location once, returning to the site after each action:
   Home contact section WhatsApp/email, footer WhatsApp/email on `/contact` and
   About, floating WhatsApp after expanding the launcher, and **Chat on WhatsApp**
   in the information modal. Repeat after client-side navigation to a service
   and a blog page. Test clicks on both the icon and text. Each click should
   produce exactly one corresponding contact event for `G-35HJ3QBMKJ`, and zero
   of the other contact event. Opening Information itself must produce neither.
5. In the same property's GA Admin > Data display > **DebugView**, select the
   test device enabled by Tag Assistant and verify that the events actually
   arrive once each. Check their exact spelling and destination. Queue entries,
   console output or Tag Assistant command visibility alone do not prove GA4
   receipt. For additional transport diagnosis, inspect Network `g/collect`:
   the hit should identify `tid=G-35HJ3QBMKJ` and the appropriate `en` event name.
   A successful HTTP response alone is not the final property-side verification.
6. Confirm WhatsApp opens as before (including `_blank` links, Ctrl/Meta/middle
   click where supported), and `mailto:` opens the configured email app.
   Temporarily block the Google tag request on the test device, reload, and
   confirm both links still work without waiting. Remove the block afterwards.
   If consent controls exist outside this repository, also test their real
   denied/granted states without overriding them; DebugView may omit events
   when Analytics consent is denied.
7. In Google Ads, inspect the existing GA4-sourced actions **WhatsApp Click** and
   **Email Click** and verify the exact mapping above and linked property. Both
   actions can be used by the intended campaign after verification; do not
   create duplicate actions or use the old **Contact Us** page-load action as
   evidence of either click. Do not activate a campaign as part of testing.

Save the Tag Assistant session and DebugView evidence (event name, stream,
timestamp, count per click) to record acceptance. Close debugging afterwards.

Contact-tracking references:

- [Explicit event destination with send_to](https://developers.google.com/tag-platform/gtagjs/routing)
- [Send GA4 events](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Connect Tag Assistant](https://support.google.com/tagassistant/answer/10039345)
- [Enable and inspect DebugView](https://support.google.com/analytics/answer/7201382)

References:

- [Next.js script loading](https://nextjs.org/learn/seo/third-party-scripts)
- [Google SPA measurement](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Google Analytics opt-out flag](https://developers.google.com/tag-platform/security/guides/privacy)
