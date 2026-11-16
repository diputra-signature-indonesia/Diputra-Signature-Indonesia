'use client';

import { COOKIE_PREFERENCES_EVENT } from '@/lib/site-consent';

export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT))}>
      Cookie preferences
    </button>
  );
}
