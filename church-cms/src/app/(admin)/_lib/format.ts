/**
 * Formatting helpers shared by admin pages.
 *
 * Kept small and framework-free so pages can import them server- or
 * client-side without triggering a `'use client'` boundary.
 */

/** Format a money amount stored as integer minor units (e.g. cents). */
export function formatMoney(
  amountMinor: number,
  currency: string = 'TZS',
  locale: string = 'en-TZ',
): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    // Fall back for unknown currency codes.
    return `${currency} ${major.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
  }
}

/** Format a count with thousand separators. */
export function formatCount(
  value: number | null | undefined,
  locale: string = 'en-TZ',
): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString(locale);
}

/**
 * Format an ISO date (yyyy-mm-dd) or ISO datetime into a human-readable
 * medium-length label in the admin's locale.
 */
export function formatDate(
  input: string | Date | null | undefined,
  locale: string = 'en-TZ',
): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return typeof input === 'string' ? input : '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Format an ISO datetime into a "Mon 10 Nov · 09:30" style label. */
export function formatDateTime(
  input: string | Date | null | undefined,
  locale: string = 'en-TZ',
): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return typeof input === 'string' ? input : '—';
  const datePart = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${datePart} · ${timePart}`;
}

/** Title-case a snake_case or kebab-case identifier for display. */
export function titleCase(code: string | null | undefined): string {
  if (!code) return '';
  return code
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Return "N days ago" style label; falls back to a formatted date. */
export function relativeTime(
  input: string | Date | null | undefined,
  locale: string = 'en',
): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, seconds] of units) {
    if (abs >= seconds || unit === 'second') {
      const value = Math.round(diffSeconds / seconds);
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        value,
        unit,
      );
    }
  }
  return formatDate(date, locale);
}
