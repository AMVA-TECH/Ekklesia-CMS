import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import {
  permissions,
  rolePermissions,
  roles,
  userRoleAssignments,
} from '@/modules/access-control/db-schema';
import { organisationUsers } from '@/modules/people/db-schema';

/** Active organisation_users row for user@church, if any. */
export async function findActiveOrganisationUser(
  db: Db,
  churchId: string,
  userAccountId: string,
) {
  const [row] = await db
    .select({
      id: organisationUsers.id,
      personId: organisationUsers.personId,
      status: organisationUsers.status,
    })
    .from(organisationUsers)
    .where(
      and(
        eq(organisationUsers.churchId, churchId),
        eq(organisationUsers.userAccountId, userAccountId),
        eq(organisationUsers.status, 'active'),
        isNull(organisationUsers.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Effective permission codes from active role assignments in the church. */
export async function listEffectivePermissionCodes(
  db: Db,
  churchId: string,
  userAccountId: string,
): Promise<string[]> {
  const now = new Date();
  const assignmentRows = await db
    .select({
      roleId: userRoleAssignments.roleId,
      effectiveFrom: userRoleAssignments.effectiveFrom,
      effectiveTo: userRoleAssignments.effectiveTo,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
    .where(
      and(
        eq(userRoleAssignments.churchId, churchId),
        eq(userRoleAssignments.userAccountId, userAccountId),
        isNull(userRoleAssignments.deletedAt),
        isNull(roles.deletedAt),
      ),
    );

  const roleIds = assignmentRows
    .filter(
      (r) =>
        r.effectiveFrom <= now &&
        (r.effectiveTo === null || r.effectiveTo > now),
    )
    .map((r) => r.roleId);

  if (roleIds.length === 0) return [];

  const permRows = await db
    .selectDistinct({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(inArray(rolePermissions.roleId, roleIds));

  return permRows.map((p) => p.code);
}
