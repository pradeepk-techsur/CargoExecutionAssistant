// The ONE date+time formatter for the whole SPA (FR-8.14, UX conventions).
//
// Absolute, LOCAL date+time, month in words, 24-hour clock, NO relative phrasing
// ("2 days ago" / "yesterday" is forbidden anywhere in this codebase). This is
// the single deliberately fixed-locale formatting function: `en-GB` gives the
// FRD's "11 Sep 2026, 14:32" ordering (day-month-year) and a 24-hour clock with
// no AM/PM, matching the FRD's example exactly. Phase 5/6's case-detail screens
// reuse this unchanged, so the whole product renders one date shape.

// The twelve three-letter month abbreviations, fixed by this module rather than
// read from Intl: ICU data varies by runtime — some builds render September's
// `month: 'short'` as "Sept" (four letters), others as "Sep" — and the FRD's
// example ("11 Sep 2026, 14:32") plus every reuse in Phase 5/6 must render one
// stable shape, not one that drifts with the platform's ICU version. Only the
// month name is fixed this way; day, year and time still come from Intl so the
// LOCAL calendar day and local wall-clock time are honoured.
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** "11 Sep 2026, 14:32" — absolute local date+time, 24-hour clock, month in words. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  // Derive the LOCAL day/month/year from the parts formatter so the month index
  // matches the local calendar day (e.g. a value near midnight UTC can be a
  // different local date). en-GB gives day-month-year, 2-digit day.
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  const day = String(Number(get('day'))); // strip a leading zero → "1", "11"
  const monthIndex = Number(get('month')) - 1;
  const month = MONTHS_SHORT[monthIndex] ?? get('month');
  const year = get('year');

  const timePart = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${day} ${month} ${year}, ${timePart}`;
}
