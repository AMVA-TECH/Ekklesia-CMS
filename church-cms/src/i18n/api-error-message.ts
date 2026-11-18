'use client';

import { useTranslations } from 'next-intl';
import { ApiError } from '@/app/_ekklesia/session';

const KNOWN_CODES = [
  'unauthorized',
  'forbidden',
  'not_found',
  'validation_failed',
  'conflict',
  'rate_limited',
  'internal_error',
] as const;

type KnownCode = (typeof KNOWN_CODES)[number];

type ApiErrorTranslate = {
  (key: KnownCode | `${KnownCode}Title` | 'network' | 'unknown'): string;
};

function isKnownCode(value: string | undefined): value is KnownCode {
  return Boolean(value && (KNOWN_CODES as readonly string[]).includes(value));
}

/**
 * Map an `ApiError` (or unknown throw) to a localized user-facing string.
 * Prefers stable `code` from problem+json; falls back to server detail / message.
 */
export function formatApiErrorMessage(
  error: unknown,
  t: ApiErrorTranslate,
): string {
  if (!(error instanceof Error)) return t('unknown');

  if (error instanceof ApiError) {
    if (error.status === 0) return t('network');
    if (isKnownCode(error.code)) return t(error.code);
    const detail = error.detail?.trim();
    if (detail) return detail;
    if (error.message.trim()) return error.message;
    return t('unknown');
  }

  return error.message.trim() || t('unknown');
}

/** Localized title for a problem `code` (toasts / banners). */
export function formatApiErrorTitle(
  code: string | undefined,
  t: ApiErrorTranslate,
): string {
  if (isKnownCode(code)) return t(`${code}Title`);
  return t('unknown');
}

/** Hook wrapper for client components. */
export function useApiErrorMessage(): (error: unknown) => string {
  const t = useTranslations('ApiErrors');
  return (error: unknown) => formatApiErrorMessage(error, t);
}
