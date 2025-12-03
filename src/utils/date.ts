/*

  ===========================================================
  📅 DATE UTILITIES — Documentation
  ===========================================================

  File ini berisi kumpulan helper untuk memformat tanggal
  dalam berbagai format yang dipakai di seluruh website DSI.
  Semua function aman (safe), tidak menyebabkan crash,
  dan otomatis fallback jika input tidak valid.

  -----------------------------------------------------------
  🔹 1. Blog listing (vertical date layout)
  -----------------------------------------------------------

    const { day, month, year } = formatDateParts(post.date);

    <p>{day}</p>
    <p>{month}</p>
    <p>{year}</p>

    Output:
      01
      12
      2025


  -----------------------------------------------------------
  🔹 2. Blog card / mobile — Format pendek (DD/MM/YYYY)
  -----------------------------------------------------------

    <p>{formatDateDisplay(post.date)}</p>

    Output:
      01/12/2025


  -----------------------------------------------------------
  🔹 3. Blog detail page — Format panjang
  -----------------------------------------------------------

    <p>{formatDateLong(post.date)}</p>

    Output:
      01 Dec 2025


  -----------------------------------------------------------
  🔹 4. Relative date — "2 days ago", "in 3 months"
  -----------------------------------------------------------

    <p>{getRelativeDate(post.date)}</p>

    Output contoh:
      3 days ago
      in 2 months
      yesterday


  -----------------------------------------------------------
  🔹 5. Safe parsing — tidak error meskipun input tidak valid
  -----------------------------------------------------------

    formatDateDisplay("invalid input")

    Output:
      "invalid input"

    (Tidak crash, tidak error, UI tetap aman)


  -----------------------------------------------------------
  🔹 6. Format untuk Database (ISO)
  -----------------------------------------------------------

    formatToISOForDB("2025-12-01")

    Output:
      "2025-12-01T00:00:00.000Z"


  -----------------------------------------------------------
  🔹 7. SEO Structured Data (Google Schema)
  -----------------------------------------------------------

    formatForMetaSchema("2025-12-01")

    Output:
      "2025-12-01"

    Digunakan untuk:
      "datePublished"
      "dateModified"
      JSON-LD metadata


  -----------------------------------------------------------
  🔹 8. Short Month Format — "Jan", "Feb", "Dec"
  -----------------------------------------------------------

    formatShortMonth("2025-12-01")

    Output:
      "Dec"


  -----------------------------------------------------------
  🔹 9. Range tanggal
  -----------------------------------------------------------

    getDateRange("2025-12-01", "2025-12-05")

    Output:
      "01–05 Dec 2025"

    Contoh lain:
      getDateRange("2025-11-28", "2025-12-03")
        -> "28 Nov – 03 Dec 2025"

      getDateRange("2025-12-28", "2026-01-02")
        -> "28 Dec 2025 – 02 Jan 2026"


  ===========================================================
  Semua function dibuat ringan, aman, dan mendukung
  international format ("en-US"). Jika nanti ingin format lokal
  Indonesia ("id-ID") juga bisa ditambahkan.
  ===========================================================

*/

/**
 * Safely create a Date object from string.
 * Returns null if invalid.
 */
export function safeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/* -------------------------------------------------------------------------- */
/*                               BASIC FORMATS                                */
/* -------------------------------------------------------------------------- */

/**
 * Format date into DD/MM/YYYY
 * Example: "2025-12-01" -> "01/12/2025"
 */
export function formatDateDisplay(dateStr: string): string {
  const date = safeDate(dateStr);
  if (!date) return dateStr;

  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();

  return `${d}/${m}/${y}`;
}

/**
 * Format into UI-friendly form with short month.
 * Example: "2025-12-01" -> "01 Dec 2025"
 */
export function formatDateLong(dateStr: string): string {
  const date = safeDate(dateStr);
  if (!date) return dateStr;

  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Get short month only: "Dec", "Jan", etc.
 */
export function formatShortMonth(dateStr: string): string {
  const date = safeDate(dateStr);
  if (!date) return '--';
  return date.toLocaleString('en-US', { month: 'short' });
}

/**
 * Extract day, month, year for vertical UI layouts.
 */
export function formatDateParts(dateStr: string) {
  const date = safeDate(dateStr);
  if (!date) return { day: '--', month: '--', year: '----' };

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();

  return { day, month, year };
}

/* -------------------------------------------------------------------------- */
/*                              RELATIVE DATES                                */
/* -------------------------------------------------------------------------- */

/**
 * Returns "x days ago" or "in 2 months"
 */
export function getRelativeDate(dateStr: string): string {
  const date = safeDate(dateStr);
  if (!date) return dateStr;

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const abs = Math.abs(diff);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  const f = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (abs < hour) return f.format(Math.round(diff / minute), 'minute');
  if (abs < day) return f.format(Math.round(diff / hour), 'hour');
  if (abs < month) return f.format(Math.round(diff / day), 'day');
  if (abs < year) return f.format(Math.round(diff / month), 'month');

  return f.format(Math.round(diff / year), 'year');
}

/* -------------------------------------------------------------------------- */
/*                          DATABASE & META HELPERS                           */
/* -------------------------------------------------------------------------- */

/**
 * Convert date to ISO string suitable for DB storage.
 * Example output: "2025-12-01T00:00:00.000Z"
 */
export function formatToISOForDB(dateStr: string): string | null {
  const date = safeDate(dateStr);
  return date ? date.toISOString() : null;
}

/**
 * Format date for Google Structured Data (schema.org)
 * Example output: "2025-12-01"
 * Required for JSON-LD metadata for blog posts.
 */
export function formatForMetaSchema(dateStr: string): string | null {
  const date = safeDate(dateStr);
  if (!date) return null;
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/* -------------------------------------------------------------------------- */
/*                          DATE RANGE UTILITIES                              */
/* -------------------------------------------------------------------------- */

/**
 * Get date range in human-friendly format:
 * - Same month: "01–05 Dec 2025"
 * - Different months: "28 Nov – 03 Dec 2025"
 * - Different years: "28 Dec 2025 – 02 Jan 2026"
 */
export function getDateRange(startStr: string, endStr: string): string {
  const start = safeDate(startStr);
  const end = safeDate(endStr);
  if (!start || !end) return `${startStr} – ${endStr}`;

  const sDay = start.getDate().toString().padStart(2, '0');
  const sMonth = start.toLocaleString('en-US', { month: 'short' });
  const sYear = start.getFullYear();

  const eDay = end.getDate().toString().padStart(2, '0');
  const eMonth = end.toLocaleString('en-US', { month: 'short' });
  const eYear = end.getFullYear();

  // same year & month → 01–05 Dec 2025
  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay}–${eDay} ${sMonth} ${sYear}`;
  }

  // same year, different months → 28 Nov – 03 Dec 2025
  if (sYear === eYear) {
    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
  }

  // different years
  return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
}
