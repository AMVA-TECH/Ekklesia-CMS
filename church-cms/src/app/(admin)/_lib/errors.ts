import { ApiError } from '@/app/_ekklesia/session';

/** Human message for any thrown value from `apiFetch` or app code. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? err.message ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Field-level validation messages from an API 422 envelope
 * (`{ details: [{ field, message }] }`), keyed by field name.
 */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const body = err.body as {
    details?: Array<{ field?: string; message?: string }>;
  } | null;
  const out: Record<string, string> = {};
  for (const d of body?.details ?? []) {
    if (d.field && d.message) out[d.field] = d.message;
  }
  return out;
}

/** Parse a major-unit amount typed by a user into integer minor units. */
export function toMinorUnits(value: string): number | null {
  const n = Number(value.replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Today as yyyy-mm-dd in the browser's local time (call from handlers only). */
export function todayLocalIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}
