import { LOCALE_COOKIE, isAppLocale, type AppLocale } from './config';

/** Read locale cookie in the browser (non-httpOnly). */
export function readLocaleCookie(): AppLocale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(LOCALE_COOKIE.length + 1));
  return isAppLocale(value) ? value : null;
}

/**
 * Align the UI locale cookie with a profile/church locale.
 * Returns true when the cookie changed (caller should `router.refresh()`).
 */
export async function syncLocaleCookie(
  locale: string | null | undefined,
): Promise<boolean> {
  if (!isAppLocale(locale)) return false;
  if (readLocaleCookie() === locale) return false;

  const res = await fetch('/api/locale', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locale }),
  });
  return res.ok;
}
