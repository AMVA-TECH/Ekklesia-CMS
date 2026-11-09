import type { Ctx } from '@/platform/auth';
import type { PermissionCode } from './permissions';

export type AuthScope = {
  type: 'church' | 'organisational_unit' | 'self' | 'household';
  organisationalUnitId?: string;
};

/**
 * Service-layer authorization. Default deny.
 * Scope checks (unit/self/household) apply when scopesByPermission is present.
 */
export function can(
  ctx: Ctx,
  permission: PermissionCode,
  resource?: { organisationalUnitId?: string; personId?: string; householdId?: string },
): boolean {
  if (!ctx.permissions.has(permission)) return false;

  const scopes = ctx.scopesByPermission?.get(permission);
  if (!scopes || scopes.length === 0) return true;

  return scopes.some((scope) => {
    switch (scope.type) {
      case 'church':
        return true;
      case 'organisational_unit':
        return (
          !!resource?.organisationalUnitId &&
          resource.organisationalUnitId === scope.organisationalUnitId
        );
      case 'self':
        return !!ctx.actor.personId && resource?.personId === ctx.actor.personId;
      case 'household':
        return !!resource?.householdId;
      default:
        return false;
    }
  });
}
