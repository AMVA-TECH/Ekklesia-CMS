import { apiFetch } from './api-fetch';
import { ROLE_CODES } from './types';

/**
 * Slim `/api/v1/auth/me` fields used for post-login routing.
 * Matches the backend DTO without importing admin `_lib` into auth pages.
 */
interface AuthMeForRedirect {
  mfaRequired?: boolean;
  roles?: ReadonlyArray<{ code: string }>;
}

const ADMIN_ROLE_CODES = new Set<string>([
  ROLE_CODES.churchAdministrator,
  ROLE_CODES.financeOfficer,
  ROLE_CODES.pastor,
  ROLE_CODES.ministryLeader,
  ROLE_CODES.platformOperator,
]);

/** Strip spaces/dashes so typed phone numbers still validate as E.164. */
export function normalizePhoneE164(raw: string): string {
  return raw.trim().replace(/[\s()-]/g, '');
}

/**
 * Only allow same-origin relative paths (blocks open redirects).
 */
export function sanitizeAppRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return null;
  }
  if (value.includes('\\') || value.includes('\n') || value.includes('\r')) {
    return null;
  }
  return value;
}

function isAdminMe(me: AuthMeForRedirect): boolean {
  if (me.mfaRequired) return true;
  return (me.roles ?? []).some((role) => ADMIN_ROLE_CODES.has(role.code));
}

/**
 * After PIN (or MFA) succeeds, pick where to send the user.
 *
 * - Explicit safe `redirect` query wins when present.
 * - Otherwise admins land on `/admin/dashboard`, everyone else on `/home`.
 */
export async function resolvePostAuthPath(
  requestedRedirect?: string | null,
): Promise<string> {
  const safe = sanitizeAppRedirect(requestedRedirect);
  if (safe) return safe;

  try {
    const me = await apiFetch<AuthMeForRedirect>('/api/v1/auth/me', {
      skipDevAuth: true,
    });
    return isAdminMe(me) ? '/admin/dashboard' : '/home';
  } catch {
    return '/home';
  }
}

/** Detect Better Auth / wrapped login payloads that require MFA. */
export function loginRequiresMfa(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const body = payload as Record<string, unknown>;
  if (body.twoFactorRedirect === true) return true;
  if (body.twoFactorRedirect === 'true') return true;
  const nested = body.data;
  if (nested && typeof nested === 'object') {
    return (nested as { twoFactorRedirect?: unknown }).twoFactorRedirect === true;
  }
  return false;
}
