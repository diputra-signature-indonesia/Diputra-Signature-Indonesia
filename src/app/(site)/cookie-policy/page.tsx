import { CookiePreferencesButton } from '@/components/layout/cookie-preferences-button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Information about website measurement cookies and how to change your cookie preferences on the Diputra website.',
  alternates: { canonical: '/cookie-policy' },
};

export default function CookiePolicyPage() {
  return (
    <article className="brand-section-px mx-auto max-w-5xl space-y-7 py-16 text-[#292323] sm:py-24">
      <header>
        <p className="mb-3 text-sm font-medium text-[#800020]">Privacy choices</p>
        <h1 className="brand-h1">Cookie Policy</h1>
        <p className="mt-4 text-sm text-[#746B6C]">Updated 16 November 2026 · Version 2026-11-16.1</p>
      </header>
      <p className="leading-7">
        This page explains the Analytics and advertising-measurement controls implemented on this website. It is not a complete privacy notice for other activities, such as handling enquiries
        submitted through a form.
      </p>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What the optional measurement does</h2>
        <p className="leading-7">
          We use Google Analytics 4 to measure visits and website use. If you allow advertising measurement, clicks on WhatsApp and email links can also be measured using Analytics events for Google
          Ads. Our contact-click events do not include your email address, the message you write, or the destination link as custom event parameters. Google Analytics also processes its standard
          measurement data.
        </p>
        <p className="leading-7">
          These controls do not enable remarketing or personalised advertising. You can read about Google’s processing in{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#800020] underline underline-offset-4">
            Google’s Privacy Policy
          </a>
          .
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">When we ask</h2>
        <p className="leading-7">
          For visitors located in the European Economic Area, the United Kingdom or Switzerland, optional measurement stays off until the relevant permission is given. If we cannot determine your
          region, we also ask before loading the measurement tag. We use the country information provided by our hosting infrastructure; this consent feature does not store your IP address or ask for
          your device location.
        </p>
        <p className="leading-7">
          Outside these regions, Analytics and advertising measurement follow the website’s regional defaults unless you have saved a different choice. A saved rejection is respected in every region.
          This regional configuration is not an assessment of every other region’s privacy requirements.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Storage and duration</h2>
        <p className="leading-7">
          Your choices, their date, expiry time and policy version are stored in this browser’s local storage under <code>dsi:cookie-consent</code> for 180 days. This preference storage allows us to
          remember a rejection as well as an acceptance. If the choice expires or this policy version changes, we ask again.
        </p>
        <p className="leading-7">
          If local storage cannot save the choice, we try an essential preference cookie named <code>dsi_cookie_consent</code> with the same 180-day expiry. If neither storage method is available, the
          current page remembers your choice temporarily and displays a warning that it could not be saved.
        </p>
        <p className="leading-7">
          When permitted, Google measurement may use first-party cookies such as <code>_ga</code> and <code>_ga_*</code> for Analytics and <code>_gcl_*</code> or <code>_gac_*</code> for advertising
          measurement, depending on the active Google configuration. The actual cookies and their expiry are visible in your browser’s site-data controls.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Change or withdraw your choice</h2>
        <p className="leading-7">
          Use Cookie preferences below or in the footer at any time. Rejecting optional tracking does not prevent navigation, submitting an enquiry, or opening WhatsApp or email. Withdrawing
          permission pauses further measurement and may reload the page to remove previously loaded tracking code. Save any unfinished form before withdrawing.
        </p>
        <p className="leading-7">
          When you withdraw, we attempt to remove the known measurement cookies accessible to this website, while preserving unrelated cookies. Browser restrictions can prevent removal of some
          cookies; you can remove remaining site data through your browser settings. Withdrawal cannot undo information already sent to Google before your choice changed.
        </p>
        <CookiePreferencesButton className="mt-3 min-h-11 rounded-lg border border-[#800020] px-5 py-2.5 text-sm font-semibold text-[#800020] hover:bg-[#F7EDEF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]" />
      </section>
    </article>
  );
}
