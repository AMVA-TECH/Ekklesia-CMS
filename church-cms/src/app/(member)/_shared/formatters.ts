import { intlLocale, t } from '@/app/_ekklesia/i18n/core';

/**
 * Light formatting helpers for member screens.
 *
 * We deliberately keep these display-only; business rules live in the backend.
 */

/** Format an ISO date (YYYY-MM-DD) for a phone-friendly display. */
export function formatServiceDate(iso: string): string {
  // Build at local timezone midday to avoid off-by-one timezone drift.
  const [y, m, d] = iso.split('-').map((v) => Number(v));
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d, 12);
  return new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** Longer weekday + month form used in headings. */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map((v) => Number(v));
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d, 12);
  return new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/** Format an ISO datetime as a short local time. */
export function formatEventTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(intlLocale(), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** "today", "tomorrow", "in 3 days", "4 days ago". */
export function formatRelativeToToday(iso: string): string {
  const [y, m, d] = iso.split('-').map((v) => Number(v));
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d, 12);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return t('Today');
  if (diffDays === 1) return t('Tomorrow');
  if (diffDays === -1) return t('Yesterday');
  if (diffDays > 1 && diffDays < 7) return t('In {0} days', diffDays);
  if (diffDays < -1 && diffDays > -7) return t('{0} days ago', Math.abs(diffDays));
  return formatServiceDate(iso);
}

/** Format a minor-unit amount as money. Uses no decimals for TZS (common). */
export function formatMoney(amountMinor: number, currency: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'TZS' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** A gentle, locale-free part-of-day greeting. */
export function timeOfDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return t('Blessings');
  if (h < 12) return t('Good morning');
  if (h < 17) return t('Good afternoon');
  if (h < 21) return t('Good evening');
  return t('Blessings');
}

/** Take the first word of a display name (for a warm, non-awkward salute). */
export function firstName(displayName: string | null | undefined): string {
  if (!displayName) return t('friend');
  const first = displayName.trim().split(/\s+/u)[0];
  if (!first || first.length < 2) return t('friend');
  return first;
}

/** Compact today-only ISO (YYYY-MM-DD) in the user's local timezone. */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
