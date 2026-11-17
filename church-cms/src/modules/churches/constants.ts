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

/** Opaque church_settings key for the organisation logo media asset id. */
export const CHURCH_LOGO_MEDIA_SETTING = 'logoMediaId';

/** Authorised content URL for a church-scoped media asset. */
export function churchLogoContentUrl(
  mediaId: string | null | undefined,
): string | null {
  if (!mediaId || typeof mediaId !== 'string') return null;
  return `/api/v1/media/${mediaId}/content`;
}

/** Read logoMediaId from a church settings blob (branding or legacy flat key). */
export function readLogoMediaId(
  settings: Record<string, unknown> | null | undefined,
): string | null {
  const branding = settings?.branding;
  if (
    branding &&
    typeof branding === 'object' &&
    !Array.isArray(branding) &&
    typeof (branding as { logoMediaId?: unknown }).logoMediaId === 'string'
  ) {
    const id = (branding as { logoMediaId: string }).logoMediaId;
    return id.length > 0 ? id : null;
  }
  const raw = settings?.[CHURCH_LOGO_MEDIA_SETTING];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}
