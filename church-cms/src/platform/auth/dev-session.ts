import type { SessionClaims } from './require-ctx';

/**
 * Temporary request-header session for local/dev until ADR-0002 auth lands.
 * Production must reject this path.
 *
 * Headers:
 *   x-dev-user-id, x-dev-church-id, x-dev-person-id?, x-dev-permissions (comma-separated)
 */
export function readDevSession(request: Request): SessionClaims | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const userAccountId = request.headers.get('x-dev-user-id');
  const activeChurchId = request.headers.get('x-dev-church-id');
  if (!userAccountId || !activeChurchId) {
    return null;
  }

  const permissionsHeader = request.headers.get('x-dev-permissions') ?? '';
  const permissions = permissionsHeader
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    userAccountId,
    activeChurchId,
    personId: request.headers.get('x-dev-person-id') ?? undefined,
    permissions,
  };
}
