/**
 * Ekklesia UI locales — aligned with people/church schema enums (`en` | `sw`).
 * Default is Swahili (pilot / Tanzania).
 */

export const APP_LOCALES = ['en', 'sw'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'sw';

/** Cookie that drives next-intl without URL prefixes. */
export const LOCALE_COOKIE = 'ekklesia.locale';

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'sw';
}

export function parseAppLocale(
  value: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  if (isAppLocale(value)) return value;
  return fallback;
}
