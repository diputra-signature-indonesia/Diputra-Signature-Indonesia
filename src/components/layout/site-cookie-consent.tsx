'use client';

import { COOKIE_PREFERENCES_EVENT, NO_CONSENT, type ConsentPreferences } from '@/lib/site-consent';
import type { ConsentSnapshot } from '@/lib/site-consent-runtime';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const choiceButton =
  'min-h-11 rounded-lg border border-[#800020] bg-white px-4 py-2.5 text-sm font-semibold text-[#800020] transition hover:bg-[#F7EDEF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]';
const allPreferences = { analytics: true, advertising: true };

function PolicyLink() {
  return (
    <Link href="/cookie-policy" className="font-medium text-[#800020] underline underline-offset-4">
      Cookie Policy
    </Link>
  );
}

function PreferencesDialog({ consent, onSave, onClose }: { consent: ConsentSnapshot; onSave: (value: ConsentPreferences) => void; onClose: () => void }) {
  const [preferences, setPreferences] = useState<ConsentPreferences>(consent.record ?? NO_CONSENT);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  function save(value: ConsentPreferences) {
    onSave(value);
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="cookie-preferences-title"
      aria-describedby="cookie-preferences-description"
      data-lenis-prevent
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[#E4DADD] bg-white p-0 text-[#292323] shadow-xl backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-[#E4DADD] px-5 py-5 sm:px-7">
        <h2 id="cookie-preferences-title" className="text-xl font-semibold">
          Cookie preferences
        </h2>
        <button type="button" onClick={onClose} aria-label="Close cookie preferences" className="rounded-lg p-2 hover:bg-[#F7EDEF] focus-visible:outline-2 focus-visible:outline-[#800020]">
          <X className="size-5" />
        </button>
      </div>
      <div className="space-y-5 px-5 py-5 text-sm leading-6 sm:px-7">
        <p id="cookie-preferences-description">
          Choose which optional uses you allow. You can change your choices at any time. Rejecting optional cookies will not prevent you from using this website or contacting us.
        </p>
        <div className="rounded-xl border border-[#E4DADD] p-4">
          <div className="flex justify-between gap-4 font-semibold">
            <span>Essential storage</span>
            <span className="text-xs text-[#746B6C]">Always active</span>
          </div>
          <p className="mt-1 text-[#62585B]">Remembers your cookie choices and supports necessary website functions.</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E4DADD] p-4">
          <input
            type="checkbox"
            checked={preferences.analytics}
            onChange={(event) => setPreferences({ analytics: event.target.checked, advertising: event.target.checked && preferences.advertising })}
            className="mt-1 size-4 shrink-0 accent-[#800020]"
          />
          <span>
            <span className="block font-semibold">Analytics</span>
            <span className="text-[#62585B]">Allow Google Analytics to measure visits and how the website is used.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-[#E4DADD] p-4">
          <input
            type="checkbox"
            checked={preferences.advertising}
            disabled={!preferences.analytics}
            onChange={(event) => setPreferences({ ...preferences, advertising: event.target.checked })}
            className="mt-1 size-4 shrink-0 accent-[#800020]"
          />
          <span>
            <span className="block font-semibold">Advertising measurement</span>
            <span className="text-[#62585B]">
              Allow contact-click measurement and the use of Analytics data to measure Google Ads results. Requires Analytics. This does not enable personalised advertising or remarketing.
            </span>
          </span>
        </label>
        <p className="text-[#62585B]">
          Your choice is saved on this browser for 180 days. Withdrawing consent may reload this page to stop previously loaded tracking. Read our <PolicyLink />.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className={choiceButton} onClick={() => save(allPreferences)}>
            Accept all
          </button>
          <button type="button" className={choiceButton} onClick={() => save(NO_CONSENT)}>
            Reject non-essential
          </button>
        </div>
        <button
          type="button"
          onClick={() => save(preferences)}
          className="min-h-11 w-full rounded-lg bg-[#800020] px-4 py-2.5 font-semibold text-white hover:bg-[#68001A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]"
        >
          Save preferences
        </button>
      </div>
    </dialog>
  );
}

export function SiteCookieConsent({ consent, onSave }: { consent: ConsentSnapshot; onSave: (value: ConsentPreferences) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(COOKIE_PREFERENCES_EVENT, show);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, show);
  }, []);
  return (
    <>
      {consent.resolved && consent.needsChoice && !open ? (
        <section
          aria-label="Cookie consent"
          className="fixed inset-x-4 bottom-4 z-80 mx-auto max-w-5xl rounded-2xl border border-[#E4DADD] bg-white p-5 text-[#292323] shadow-[0_8px_40px_rgba(40,15,25,0.18)] sm:inset-x-6 sm:p-6"
        >
          <h2 className="text-lg font-semibold">Your privacy choices</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#62585B]">
            With your permission, we use Google Analytics to understand website visits and measure contact clicks for Google Ads. Personalised advertising and remarketing stay off. You can accept,
            reject, or choose separately. <PolicyLink />
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" className={choiceButton} onClick={() => onSave(allPreferences)}>
              Accept all
            </button>
            <button type="button" className={choiceButton} onClick={() => onSave(NO_CONSENT)}>
              Reject non-essential
            </button>
            <button type="button" className={choiceButton} onClick={() => setOpen(true)}>
              Manage preferences
            </button>
          </div>
        </section>
      ) : null}
      {consent.storageFailed || consent.reloadRequired ? (
        <p role="status" className="fixed bottom-2 left-4 z-90 max-w-md rounded-lg border border-[#E4DADD] bg-white px-4 py-3 text-sm text-[#62585B]">
          {consent.storageFailed
            ? 'Your choice could not be saved in this browser. Please enable essential storage to remember your preferences. Tracking stays paused after withdrawal.'
            : 'Your preferences have changed. If this page does not reload, reload it before continuing; tracking is paused.'}
        </p>
      ) : null}
      {open ? <PreferencesDialog consent={consent} onSave={onSave} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
