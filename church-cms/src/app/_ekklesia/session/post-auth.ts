import { normalizeTanzaniaPhoneE164 } from '@/platform/phone';
import { apiFetch } from './api-fetch';

/**
 * Slim `/api/v1/auth/me` fields used for post-login routing.
 * Matches the backend DTO without importing admin `_lib` into auth pages.
 */
interface AuthMeForRedirect {
  mfaRequired?: boolean;
  permissions?: ReadonlyArray<string>;
  roles?: ReadonlyArray<{ code: string }>;
  user?: { isPlatformOperator?: boolean };
}

/** Permissions that indicate admin dashboard access (not role titles). */
const ADMIN_HINT_PERMISSIONS = [
  'roles:assign',
  'roles:read',
  'church:update',
  'people:create',
  'memberships:approve',
  'funds:write',
  'journals:draft',
  'events:write',
  'units:write',
  'exports:run',
  'imports:run',
  'audit:read',
] as const;

/**
 * Normalize phone for Tanzania pilot forms.
 * Accepts local `07…` and returns E.164 `+255…` (falls back to stripped input).
 */
export function normalizePhoneE164(raw: string): string {
  return normalizeTanzaniaPhoneE164(raw) ?? raw.trim().replace(/[\s()-]/g, '');
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
  if (me.user?.isPlatformOperator) return true;
  const perms = new Set(me.permissions ?? []);
  return ADMIN_HINT_PERMISSIONS.some((code) => perms.has(code));
}

/**
 * After PIN (or MFA) succeeds, pick where to send the user.
 *
 * - Explicit safe `redirect` query wins when present.
 * - Platform operators land on `/platform`.
 * - Otherwise church admins land on `/admin/dashboard`, members on `/home`.
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
    if (me.user?.isPlatformOperator) return '/platform';
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
