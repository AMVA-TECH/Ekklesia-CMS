/** Common IANA-ish timezone strings accepted for MVP church profile. */
export const COMMON_TIMEZONES = [
  'Africa/Dar_es_Salaam',
  'Africa/Nairobi',
  'Africa/Kampala',
  'Africa/Johannesburg',
  'UTC',
] as const;

export const CHURCH_LOCALES = ['sw', 'en'] as const;
export type ChurchLocale = (typeof CHURCH_LOCALES)[number];
