import type { roles, userRoleAssignments } from './db-schema';

type RoleRow = typeof roles.$inferSelect;
type AssignmentRow = typeof userRoleAssignments.$inferSelect;

export function toRoleResponse(
  row: RoleRow,
  permissionCodes: string[] = [],
) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    permissions: permissionCodes,
  };
}

export function toRoleAssignmentResponse(row: AssignmentRow) {
  return {
    id: row.id,
    userAccountId: row.userAccountId,
    roleId: row.roleId,
    scopeType: row.scopeType,
    organisationalUnitId: row.organisationalUnitId,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
  };
}
