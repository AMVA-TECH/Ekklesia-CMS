import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from '@/i18n/config';

/**
 * Pick the blast body for a recipient.
 * Prefer a template variant matching their locale, then church default, then job body.
 */
export function resolveOutboundBody(input: {
  preferredLocale: string | null | undefined;
  churchLocale?: string | null;
  jobBody: string;
  bodiesByLocale: ReadonlyMap<string, string>;
}): string {
  const preferred = isAppLocale(input.preferredLocale)
    ? input.preferredLocale
    : null;
  const church = isAppLocale(input.churchLocale)
    ? input.churchLocale
    : DEFAULT_LOCALE;

  const order: AppLocale[] = preferred
    ? [preferred, church, DEFAULT_LOCALE, 'en']
    : [church, DEFAULT_LOCALE, 'en'];

  const seen = new Set<string>();
  for (const locale of order) {
    if (seen.has(locale)) continue;
    seen.add(locale);
    const body = input.bodiesByLocale.get(locale)?.trim();
    if (body) return body;
  }

  return input.jobBody;
}
