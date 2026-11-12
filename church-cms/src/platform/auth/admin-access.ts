import { and, eq, isNull, ne } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { roles, userRoleAssignments } from '@/modules/access-control/db-schema';

/**
 * Admin-dashboard access = any active role assignment whose role code is not `member`.
 * Pure member-portal users stay single-factor (PIN only).
 */
export async function userHasAdminDashboardAccess(
  db: Db,
  userAccountId: string,
  churchId?: string,
): Promise<boolean> {
  const now = new Date();
  const conditions = [
    eq(userRoleAssignments.userAccountId, userAccountId),
    isNull(userRoleAssignments.deletedAt),
    isNull(roles.deletedAt),
    ne(roles.code, 'member'),
  ];
  if (churchId) {
    conditions.push(eq(userRoleAssignments.churchId, churchId));
  }

  const rows = await db
    .select({
      roleCode: roles.code,
      effectiveFrom: userRoleAssignments.effectiveFrom,
      effectiveTo: userRoleAssignments.effectiveTo,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
    .where(and(...conditions));

  return rows.some(
    (r) =>
      r.effectiveFrom <= now &&
      (r.effectiveTo === null || r.effectiveTo > now),
  );
}
