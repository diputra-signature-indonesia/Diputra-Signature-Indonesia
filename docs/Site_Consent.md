# Regional consent and Google Consent Mode v2

Implementation prepared for review on 16 November 2026. No deployment, Ads
campaign activation, GTM publishing or live Analytics receipt verification has
been performed. This supersedes the earlier absence of consent controls and
any proposal to apply Basic Consent Mode to all visitors.

## Scope and region resolution

- Keep direct GA4 `G-35HJ3QBMKJ`; do not install `GTM-54MX5TWJ`, another Google
  loader, or an `AW-18577710777` conversion tag. Contact events retain their exact
  existing names: WhatsApp `conversion_event_contact`, email
  `conversion_event_contact_1`, each explicitly routed to that GA4 destination.
- A fresh document starts with tracking disabled. The browser requests the
  same-origin `/api/consent-region` before loading the Google tag. The endpoint
  reads only Vercel's `x-vercel-ip-country` and only trusts it when the server's
  `VERCEL` environment indicator is `1`. No geolocation service/package is added.
- Coverage: `AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO
PL PT RO SK SI ES SE GB CH`: Google's 30 EEA countries plus the UK and Swiss
  country codes. Invalid/missing ISO country values, non-Vercel hosting, lookup
  errors, malformed responses, and a 3-second timeout resolve to `unknown`.
- Language, timezone, citizenship and client-supplied query/cookie overrides are
  not used. The feature does not read, persist, log or forward raw IP addresses.
  Vercel determines the country from the connection; its own infrastructure
  processing/logging is outside this feature's control. Neither the response
  nor local preference record contains the country or IP address.
- The endpoint reads the current request and returns `Cache-Control: private,
no-store, max-age=0`, `CDN-Cache-Control: no-store`,
  `Vercel-CDN-Cache-Control: no-store`, and `Vary: X-Vercel-IP-Country`. The fetch
  also uses `cache: no-store`. Static page HTML contains no visitor-specific
  country decision or Google loader. Do not add caching/service-worker caching
  for this endpoint. Vercel edge header delivery and CDN behavior still need
  deployment-side verification; an external reverse proxy can affect geolocation.
- The country is resolved for each new document. Client navigation retains that
  document's region decision. A later visit/reload resolves it again. A saved
  explicit rejection always wins, including after a change of region.
- Outside coverage, with no explicit saved choice, existing Analytics and
  advertising-measurement behavior is retained. This is a regional default,
  **not a recorded user acceptance**, and never grants ad personalisation.
  This configuration is not a legal compliance assessment of other regions.

## Consent matrix

| Situation                                                    | Load Google tag              | `analytics_storage` | `ad_storage` | `ad_user_data` | `ad_personalization` | Contact conversions |
| ------------------------------------------------------------ | ---------------------------- | ------------------- | ------------ | -------------- | -------------------- | ------------------- |
| Region pending, covered/unknown with no choice, or rejection | No                           | denied              | denied       | denied         | denied               | Off, never queued   |
| Analytics only                                               | Yes                          | granted             | denied       | denied         | denied               | Off                 |
| Analytics + advertising measurement / Accept all             | Yes                          | granted             | granted      | granted        | denied               | On                  |
| Outside coverage, no saved choice                            | Yes, after region resolution | granted             | granted      | granted        | denied               | On                  |

Advertising measurement here relies on GA4, so its checkbox requires Analytics.
An Ads-only permission is normalized to no permission rather than loading a tag
without Analytics permission. Analytics-only statistics can include Google's
standard Enhanced Measurement, but this implementation's two contact conversion
events require both permissions. Existing account-side generated-event rules
must still be checked for duplicate contact-event generation.

Before the first Google request, the existing queue receives, in order:

1. One `consent default` with all four parameters denied.
2. `set` with `ads_data_redaction: true`, `url_passthrough: false`,
   `allow_google_signals: false`, `allow_ad_personalization_signals: false`.
3. The resolved `consent update`, reflecting the regional default or saved choice.
4. Only if Analytics is allowed, `js` and the existing GA4 `config` once per document,
   with Google signals/ad personalisation disabled, followed by the single loader.

In a protected/unknown region before permission, only the local consent queue is
prepared; there is no loader, config/pageview, contact queue, cookieless measurement
ping or new measurement cookie generated by the website's tracking code. This
is Basic, not Advanced, Consent Mode. Consent commands themselves are not proof
of Google receipt. No manual pageview, Ads loader, global delayed-navigation
helper or GTM dataLayer custom event is added. SPA pageviews continue to rely on
the existing Enhanced Measurement history setting, which is an external check.

## Banner and stored choices

The English banner offers **Accept all**, **Reject non-essential**, and
**Manage preferences** at equal prominence. Optional checkboxes start unchecked;
they reflect a user's own previous choice when reopened. A native modal dialog
provides keyboard focus containment, Escape/close and focus restoration. The
banner itself does not block the rest of the page. A **Cookie preferences**
button and Cookie Policy link are present in the footer on all public pages.
Development/Preview can display the interface but do not load Google measurement.

Local storage key: `dsi:cookie-consent`. Record:

```json
{
  "analytics": false,
  "advertising": false,
  "version": "2026-11-16.1",
  "updatedAt": 1794787200000,
  "expiresAt": 1810339200000
}
```

`updatedAt` and `expiresAt` are actual Unix timestamps in milliseconds, not the
example values above. Lifetime is **180 days** from the last explicit save.
Choices are not silently renewed. Invalid/future-dated records, expired records,
or a different policy version require a fresh choice, including outside coverage.
The version should change when the policy/purposes materially change. No country,
visitor identifier, email, message or IP is stored with the choice. Local storage
is device/browser-specific, not an account-level or server-side consent ledger.

If local storage cannot save an explicit choice, an essential, host-only preference
cookie `dsi_cookie_consent` is attempted with the same record/180-day duration,
`Path=/`, `SameSite=Lax`, and `Secure` on HTTPS. Reading choices prefers the newest
valid record, so a fallback rejection cannot be overridden by an older local-storage
grant. A successful local-storage save removes the stale fallback cookie.
If both storage methods are unavailable, default to requesting permission even
outside coverage. The current document remembers explicit choices in memory,
reports that persistence failed, and a later visit may ask again; cross-visit
persistence cannot be guaranteed with both stores blocked. After withdrawal in
that condition the old document stays paused rather than automatically reloading
into an unsaved older choice. Cross-tab storage events and return to
the visible tab re-evaluate choices/expiry. A long-lived open tab also schedules
expiry checks (split into browser-safe timer intervals).

## Withdrawal and existing cookies

When a previously allowed category is denied, the handler synchronously blocks
contact measurement and sets GA's `ga-disable` flag **before** queuing the new
consent update. It attempts cookie cleanup, then reloads the current page to
unload already-executed Google code and discard its old queue. Removing only a
script DOM node would not stop automatic events from that code. Even an Ads-only
withdrawal reloads; Analytics can restart in the new document with Ads denied.
If reload is blocked, the old document remains suspended and asks for a reload.
If both preference stores failed to save, it stays paused and reports the storage
failure instead of automatically reloading; enable essential storage and save the
choice before leaving the page to make it persistent.
Unsent form input may be lost on reload; the preferences dialog explains this.

Cleanup targets accessible first-party `_ga`, `_ga_*`, `_gid`, `_gat*`, `_gcl_*`
and `_gac_*` as appropriate, across the current path/ancestor paths, host-only
scope and hostname/parent-domain scopes. Ads-only withdrawal retains Analytics
cookies. Existing measurement cookies are also cleaned on a protected visit
without permission. Auth and unrelated cookies are preserved. HttpOnly,
third-party, partitioned or inaccessible cookie scopes cannot all be removed
through JavaScript; the browser's site-data controls may be needed. Previously
transmitted/in-flight data cannot be recalled by withdrawal. Zero future browser
measurement requests and actual cookie removal still require browser validation.

Native navigation, `target="_blank"`, keyboard/middle clicks, forms, WhatsApp and
mail apps are not delayed or cancelled. Pre-consent clicks are dropped, never
buffered or replayed. The existing delegated handler checks current permissions
for every click, including dynamic links. Allowing both categories later does
not send historic clicks or repeat initialization/configuration.

## Policy content to review

No existing Privacy Policy/Cookie Policy route or official URL was found during
the repository audit. A real `/cookie-policy` route is added and linked by the
banner/footer; it describes only this implementation's demonstrable behavior.
It links to Google's own Privacy Policy for Google's processing. No legal bases,
business retention periods, contact-handling practices or other unverified
claims were invented. A complete organization-approved Privacy Policy, including
form enquiry handling and other business processing, still needs to be supplied
and linked. The technical notice and regional scope need owner review before release.

## Verification and manual acceptance

Local checks completed for this implementation:

- Full Node suite: **141 tests passed**, including **23 regional-consent tests**
  plus the updated Analytics and contact-click tests.
- Changed-file ESLint and `tsc --noEmit --incremental false`: passed.
- `npm run build`: **passed**, including TypeScript and **49/49** generated pages,
  with the existing local Supabase stack healthy. `/api/consent-region` is a
  dynamic route; `/cookie-policy` is a static public page. The pre-existing
  middleware deprecation warning is non-blocking.
- Temporary local production-mode server HTTP checks: Home, About, Contact and
  Cookie Policy returned **200** with the footer preference/policy controls and
  no external Google measurement script in the initial HTML. The policy route
  contained the fallback-cookie disclosure. The server was stopped afterwards.
- Local HTTP calls with DE/US/CH/invalid country headers plus a query override all
  returned **unknown**, as required on non-Vercel hosting. Response cache headers
  prohibit browser/CDN caching and no cookie was set by the endpoint. Trusted
  Vercel country cases were covered with controlled unit-test inputs, not a
  public override or a live Vercel deployment.
- No environment changes, new packages, DB migrations/resets/seeds, deployment,
  Git push, Google campaign activation or GTM publication were performed during
  implementation and local verification.

Automated tests use controlled country headers and injected mocked transport/DOM
objects, never a public geo/consent bypass. They check the complete region matrix,
invalid/untrusted header handling, non-cacheable endpoint response, stored choice
validation, default/update ordering, pending/no-choice/rejection/partial/accept,
reload, cross-region rejection, expiry, cross-tab withdrawal, opt-out/cookie
cleanup, no contact replay/duplicates and preserved native actions. These are
not real-browser Network/cookie checks or evidence of GA4 receipt.
Real browser layout/accessibility interaction, Network requests, actual cookie
creation/removal, Vercel edge/CDN behavior, Tag Assistant, GA4 DebugView and Google
Ads import/attribution are **not verified**. The HTTP checks do not execute the
browser JavaScript or prove zero client-side requests.

Before release, retain the existing Computer Use restrictions. A person with
browser/account access should perform the following on a controlled staging
environment built identically to Production or on the canonical domain after
the separately authorized release. Local/Preview intentionally do not load the
tag; do not add a public `?country=US`, consent cookie override or debug switch.
Use real Vercel request locations (for example, controlled VPN egress), not a
browser language/timezone override or Chrome sensor location: those do not
change the IP country used by Vercel. Check trusted edge header delivery/cache
behavior, including whether forged client country headers are overwritten.

1. With fresh browser storage, test EEA (including Iceland/Liechtenstein/Norway),
   UK and Switzerland: before choice, Network must show no Google tag,
   `g/collect`, Ads measurement or measurement cookies. Wait, open the information
   modal, navigate within the site and click a WhatsApp/mailto link. No contact
   event must be queued or replayed. Links/forms must remain usable.
2. Reject, reload, navigate and reopen preferences. Remain untracked. Visit from
   an outside location with this same rejection and confirm it still wins. In a
   separate clean outside-region browser, existing tracking should start only
   after region resolution, with ad personalisation denied and no invented saved
   acceptance. Cookie preferences must remain accessible.
3. Block `/api/consent-region`, simulate a failed response/timeout in the test
   browser, and check that the banner appears with no tag/measurement. No cache
   response may carry another visitor's decision. Local HTTP testing also checks
   untrusted injected headers remain `unknown` outside Vercel.
4. Allow Analytics only: inspect all four Consent Mode values, visits/pageviews,
   no Ads consent and no contact conversion events. Then enable advertising
   measurement: make one new WhatsApp click and one new email click. Confirm one
   event each, exact names and `G-35HJ3QBMKJ`, with no historic replay or duplicate
   `config`/pageview. Check links in the footer, contact section, floating actions
   and announcement after SPA navigation. Test blockers and native `_blank`/apps.
5. Use Tag Assistant's Consent tab and the correct property's DebugView to check
   the actual order/default/update signals and receipt of both events. No debug
   acceptance, cookie or account state is assumed from unit tests or dataLayer
   entries. Keep the draft GTM unpublished and Ads campaign inactive.
6. Withdraw Ads only and then Analytics. Inspect the reload, persisted rejection,
   cookie cleanup, retained auth cookies and no subsequent disallowed measurement.
   Test a second tab, a reload and a blocked reload. Check remaining cookie scopes
   manually and verify no unexpected advanced-mode cookieless pings occur.

## Primary references

- [Google's EEA country list](https://support.google.com/googleplay/android-developer/answer/12348241?hl=en)
- [Google's EEA/UK/Switzerland consent scope](https://support.google.com/google-ads/answer/16142339)
- [Google Basic/Advanced Consent Mode](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Consent defaults, updates and withdrawal](https://developers.google.com/tag-platform/security/guides/consent)
- [Consent debugging](https://developers.google.com/tag-platform/security/guides/consent-debugging)
- [Vercel country header](https://vercel.com/docs/headers/request-headers#x-vercel-ip-country)
- [Vercel geolocation capabilities](https://vercel.com/changelog/improved-ip-geolocation-data)
- [Vercel cache behavior](https://vercel.com/docs/caching/cdn-cache)
