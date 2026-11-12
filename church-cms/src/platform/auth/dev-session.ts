import { PERMISSIONS } from '@/modules/access-control/permissions';
import type { SessionClaims } from './require-ctx';

/**
 * Temporary request-header session for local/dev until clients use Better Auth cookies.
 * Only honoured when ALLOW_DEV_AUTH=1 and not production (see resolveSessionClaims).
 *
 * Headers:
 *   x-dev-user-id, x-dev-church-id?, x-dev-person-id?, x-dev-permissions (comma-separated)
 *   x-dev-platform-operator=1 — grants platform scope (ADR-0003)
 *   x-dev-platform-permissions — optional comma-separated platform perms
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

  // Support enter-tenant: full church permission set for platform operators.
  if (isPlatformOperator && activeChurchId) {
    permissions = [...PERMISSIONS];
  }

  const platformHeader = request.headers.get('x-dev-platform-permissions');
  const platformPermissions = isPlatformOperator
    ? (platformHeader ??
        'platform:read,platform:admin,platform:impersonate_tenant,platform:security_read')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : undefined;

  return {
    userAccountId,
    activeChurchId: activeChurchId || null,
    personId: request.headers.get('x-dev-person-id') ?? undefined,
    permissions,
    isPlatformOperator: isPlatformOperator || undefined,
    platformPermissions,
  };
}
