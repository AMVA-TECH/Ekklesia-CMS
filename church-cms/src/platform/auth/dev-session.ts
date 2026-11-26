import type { SessionClaims } from './require-ctx';
import {
  churchWideScopesForPermissions,
  serializeScopesByPermission,
} from './permissions-for-user';
import { churchPermissionsForSupportAccess } from '@/modules/platform-ops/support-access';

/**
 * Temporary request-header session for local/dev until clients use Better Auth cookies.
 * Only honoured when ALLOW_DEV_AUTH=1 and not production (see resolveSessionClaims).
 *
 * Headers:
 *   x-dev-user-id, x-dev-church-id?, x-dev-person-id?, x-dev-permissions (comma-separated)
 *   x-dev-platform-operator=1 — grants platform scope (ADR-0003)
 *   x-dev-platform-permissions — optional comma-separated platform perms
 *   x-dev-support-access-level=read|interactive — church-plane support posture
 *     (default read when platform operator + church id)
 */
export function readDevSession(request: Request): SessionClaims | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const userAccountId = request.headers.get('x-dev-user-id');
  if (!userAccountId) {
    return null;
  }

  const isPlatformOperator =
    request.headers.get('x-dev-platform-operator') === '1';
  const activeChurchId = request.headers.get('x-dev-church-id');

  if (!isPlatformOperator && !activeChurchId) {
    return null;
  }

  const permissionsHeader = request.headers.get('x-dev-permissions') ?? '';
  let permissions = permissionsHeader
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // Controlled support enter-tenant (default read).
  if (isPlatformOperator && activeChurchId) {
    const raw = request.headers.get('x-dev-support-access-level');
    const level = raw === 'interactive' ? 'interactive' : 'read';
    permissions = [...churchPermissionsForSupportAccess(level)];
  }

  const platformHeader = request.headers.get('x-dev-platform-permissions');
  const platformPermissions = isPlatformOperator
    ? (platformHeader ??
        'platform:read,platform:admin,platform:impersonate_tenant,platform:security_read')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : undefined;

  const scopesByPermission =
    permissions.length > 0
      ? serializeScopesByPermission(churchWideScopesForPermissions(permissions))
      : undefined;

  return {
    userAccountId,
    activeChurchId: activeChurchId || null,
    personId: request.headers.get('x-dev-person-id') ?? undefined,
    permissions,
    scopesByPermission,
    isPlatformOperator: isPlatformOperator || undefined,
    platformPermissions,
  };
}
