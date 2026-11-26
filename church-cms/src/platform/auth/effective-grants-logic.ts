import type { AuthScope } from '@/modules/access-control/can';

/**
 * Pure helpers for composing effective grants (testable without a database).
 * Runtime loading stays in permissions-for-user.ts.
 */

export function addScopeToMap(
  map: Map<string, AuthScope[]>,
  permission: string,
  scope: AuthScope,
): void {
  const existing = map.get(permission) ?? [];
  const duplicate = existing.some((s) => {
    if (s.type !== scope.type) return false;
    if (s.type === 'organisational_unit') {
      return s.organisationalUnitId === scope.organisationalUnitId;
    }
    return true;
  });
  if (!duplicate) {
    existing.push(scope);
    map.set(permission, existing);
  }
}

/** Assignment window: effectiveFrom <= now < effectiveTo (null to = open). */
export function isAssignmentEffective(
  effectiveFrom: Date,
  effectiveTo: Date | null,
  now: Date = new Date(),
): boolean {
  return effectiveFrom <= now && (effectiveTo === null || effectiveTo > now);
}

/** Delegation window once status is active/scheduled and row is otherwise loaded. */
export function isDelegationGrantActive(
  status: string,
  effectiveFrom: Date,
  effectiveTo: Date | null,
  now: Date = new Date(),
): boolean {
  if (status !== 'active' && status !== 'scheduled') return false;
  if (effectiveFrom > now) return false;
  if (effectiveTo !== null && effectiveTo <= now) return false;
  return true;
}

export function shouldIncludeUnitAssignment(
  organisationalUnitId: string | null | undefined,
  activeUnitIds: ReadonlySet<string>,
): boolean {
  return !!organisationalUnitId && activeUnitIds.has(organisationalUnitId);
}

export function applyAssignmentGrants(input: {
  codes: readonly string[];
  scopeType: string;
  organisationalUnitId?: string | null;
  activeUnitIds: ReadonlySet<string>;
  permissionSet: Set<string>;
  scopesByPermission: Map<string, AuthScope[]>;
}): void {
  let scope: AuthScope;
  switch (input.scopeType) {
    case 'organisational_unit':
      if (
        !shouldIncludeUnitAssignment(
          input.organisationalUnitId,
          input.activeUnitIds,
        )
      ) {
        return;
      }
      scope = {
        type: 'organisational_unit',
        organisationalUnitId: input.organisationalUnitId!,
      };
      break;
    case 'self':
      scope = { type: 'self' };
      break;
    case 'household':
      scope = { type: 'household' };
      break;
    case 'church':
    default:
      scope = { type: 'church' };
      break;
  }

  for (const code of input.codes) {
    input.permissionSet.add(code);
    addScopeToMap(input.scopesByPermission, code, scope);
  }
}
