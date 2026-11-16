export const CONSENT_VERSION = '2026-11-16.1';
export const CONSENT_STORAGE_KEY = 'dsi:cookie-consent';
export const CONSENT_COOKIE_NAME = 'dsi_cookie_consent';
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export const COOKIE_PREFERENCES_EVENT = 'dsi:cookie-preferences';

// Google EEA list plus the United Kingdom and Switzerland; see docs/Site_Consent.md.
export const CONSENT_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IS',
  'IE',
  'IT',
  'LV',
  'LI',
  'LT',
  'LU',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'GB',
  'CH',
] as const;
const isoCountries = new Set(
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' '
  )
);

export type ConsentRegion = 'required' | 'outside' | 'unknown';
export type ConsentPreferences = { analytics: boolean; advertising: boolean };
export type ConsentRecord = ConsentPreferences & { version: string; updatedAt: number; expiresAt: number };
export const NO_CONSENT: ConsentPreferences = { analytics: false, advertising: false };

export function consentRegion(headers: Headers, trustedVercel: boolean): ConsentRegion {
  if (!trustedVercel) return 'unknown';
  const country = headers.get('x-vercel-ip-country')?.trim().toUpperCase();
  if (!country || !isoCountries.has(country)) return 'unknown';
  return (CONSENT_COUNTRIES as readonly string[]).includes(country) ? 'required' : 'outside';
}

export function normalizePreferences(preferences: ConsentPreferences): ConsentPreferences {
  // This site's advertising measurement uses GA4 and therefore needs Analytics too.
  return { analytics: preferences.analytics === true, advertising: preferences.analytics === true && preferences.advertising === true };
}

export function makeConsentRecord(preferences: ConsentPreferences, now = Date.now()): ConsentRecord {
  return { ...normalizePreferences(preferences), version: CONSENT_VERSION, updatedAt: now, expiresAt: now + CONSENT_MAX_AGE_MS };
}

export function parseConsentRecord(raw: string | null, now = Date.now()): ConsentRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== CONSENT_VERSION || typeof value.analytics !== 'boolean' || typeof value.advertising !== 'boolean') return null;
    if (
      !Number.isSafeInteger(value.updatedAt) ||
      !Number.isSafeInteger(value.expiresAt) ||
      value.updatedAt > now ||
      value.updatedAt < 0 ||
      value.expiresAt <= now ||
      value.expiresAt - value.updatedAt !== CONSENT_MAX_AGE_MS
    )
      return null;
    if (value.advertising && !value.analytics) return null;
    return { analytics: value.analytics, advertising: value.advertising, version: value.version, updatedAt: value.updatedAt, expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}

export function resolveConsent(region: ConsentRegion, record: ConsentRecord | null, needsRenewal = false): ConsentPreferences {
  // An explicit choice always wins, including a rejection made in another region.
  if (record) return normalizePreferences(record);
  return region === 'outside' && !needsRenewal ? { analytics: true, advertising: true } : NO_CONSENT;
}

export function consentSignals(preferences: ConsentPreferences) {
  const normalized = normalizePreferences(preferences);
  return {
    analytics_storage: normalized.analytics ? 'granted' : 'denied',
    ad_storage: normalized.advertising ? 'granted' : 'denied',
    ad_user_data: normalized.advertising ? 'granted' : 'denied',
    ad_personalization: 'denied',
  } as const;
}
