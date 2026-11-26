import { and, eq, inArray, isNull, lte, or } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import {
  permissions,
  rolePermissions,
  roles,
  userRoleAssignments,
} from '@/modules/access-control/db-schema';
import type { AuthScope } from '@/modules/access-control/can';
import { organisationUsers } from '@/modules/people/db-schema';
import { householdMembers } from '@/modules/households/db-schema';
import {
  delegations,
  organisationalUnits,
} from '@/modules/organisation/db-schema';
import {
  addScopeToMap,
  applyAssignmentGrants,
  isAssignmentEffective,
  isDelegationGrantActive,
} from './effective-grants-logic';

/** Effective grants for a user in a church (roles + temporary delegations). */
export type EffectiveGrants = {
  permissions: string[];
  scopesByPermission: Map<string, AuthScope[]>;
  actorHouseholdIds: string[];
};

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

async function listActorHouseholdIds(
  db: Db,
  personId: string | null | undefined,
): Promise<string[]> {
  if (!personId) return [];
  const rows = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.personId, personId),
        isNull(householdMembers.deletedAt),
      ),
    );
  return rows.map((r) => r.householdId);
}

/**
 * Effective permission codes + per-permission scopes from active role
 * assignments and active organisation delegations.
 */
export async function listEffectiveGrants(
  db: Db,
  churchId: string,
  userAccountId: string,
  personId?: string | null,
): Promise<EffectiveGrants> {
  const now = new Date();
  const scopesByPermission = new Map<string, AuthScope[]>();
  const permissionSet = new Set<string>();

  const assignmentRows = await db
    .select({
      roleId: userRoleAssignments.roleId,
      scopeType: userRoleAssignments.scopeType,
      organisationalUnitId: userRoleAssignments.organisationalUnitId,
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

  const activeAssignments = assignmentRows.filter((r) =>
    isAssignmentEffective(r.effectiveFrom, r.effectiveTo, now),
  );

  const roleIds = [...new Set(activeAssignments.map((r) => r.roleId))];
  const permsByRole = new Map<string, string[]>();

  if (roleIds.length > 0) {
    const permRows = await db
      .select({
        roleId: rolePermissions.roleId,
        code: permissions.code,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(inArray(rolePermissions.roleId, roleIds));

    for (const row of permRows) {
      const list = permsByRole.get(row.roleId) ?? [];
      list.push(row.code);
      permsByRole.set(row.roleId, list);
    }
  }

  const unitIds = [
    ...new Set(
      activeAssignments
        .filter((a) => a.scopeType === 'organisational_unit')
        .map((a) => a.organisationalUnitId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const activeUnitIds = new Set<string>();
  if (unitIds.length > 0) {
    const unitRows = await db
      .select({
        id: organisationalUnits.id,
        status: organisationalUnits.status,
      })
      .from(organisationalUnits)
      .where(
        and(
          eq(organisationalUnits.churchId, churchId),
          inArray(organisationalUnits.id, unitIds),
          isNull(organisationalUnits.deletedAt),
        ),
      );
    for (const row of unitRows) {
      if (row.status === 'active') activeUnitIds.add(row.id);
    }
  }

  for (const assignment of activeAssignments) {
    applyAssignmentGrants({
      codes: permsByRole.get(assignment.roleId) ?? [],
      scopeType: assignment.scopeType,
      organisationalUnitId: assignment.organisationalUnitId,
      activeUnitIds,
      permissionSet,
      scopesByPermission,
    });
  }

  // Temporary organisation delegations (grants JSON array of permission codes).
  const delegationRows = await db
    .select({
      grants: delegations.grants,
      effectiveFrom: delegations.effectiveFrom,
      effectiveTo: delegations.effectiveTo,
      status: delegations.status,
    })
    .from(delegations)
    .where(
      and(
        eq(delegations.churchId, churchId),
        eq(delegations.delegateUserId, userAccountId),
        isNull(delegations.deletedAt),
        or(
          eq(delegations.status, 'active'),
          eq(delegations.status, 'scheduled'),
        ),
        lte(delegations.effectiveFrom, now),
      ),
    );

  for (const row of delegationRows) {
    if (
      !isDelegationGrantActive(
        row.status,
        row.effectiveFrom,
        row.effectiveTo,
        now,
      )
    ) {
      continue;
    }
    // Treat scheduled-but-started and active the same once effectiveFrom passed.
    const grants = Array.isArray(row.grants) ? row.grants : [];
    for (const raw of grants) {
      if (typeof raw !== 'string' || raw.length === 0) continue;
      permissionSet.add(raw);
      addScopeToMap(scopesByPermission, raw, { type: 'church' });
    }
  }

  const actorHouseholdIds = await listActorHouseholdIds(db, personId);

  return {
    permissions: [...permissionSet],
    scopesByPermission,
    actorHouseholdIds,
  };
}

/** @deprecated Prefer listEffectiveGrants — kept for call sites that only need codes. */
export async function listEffectivePermissionCodes(
  db: Db,
  churchId: string,
  userAccountId: string,
): Promise<string[]> {
  const grants = await listEffectiveGrants(db, churchId, userAccountId);
  return grants.permissions;
}

/** Serialize scopes map for session claims / JSON. */
export function serializeScopesByPermission(
  map: Map<string, AuthScope[]>,
): Record<string, AuthScope[]> {
  const out: Record<string, AuthScope[]> = {};
  for (const [key, value] of map) {
    out[key] = value;
  }
  return out;
}

export function deserializeScopesByPermission(
  raw: Record<string, AuthScope[]> | undefined | null,
): Map<string, AuthScope[]> | undefined {
  if (!raw) return undefined;
  return new Map(Object.entries(raw));
}

/** Church-wide scope map for every permission (platform break-glass). */
export function churchWideScopesForPermissions(
  codes: readonly string[],
): Map<string, AuthScope[]> {
  const map = new Map<string, AuthScope[]>();
  for (const code of codes) {
    map.set(code, [{ type: 'church' }]);
  }
  return map;
}

/** Dev-header helper: treat listed permissions as church-scoped. */
export function grantsFromPermissionList(codes: string[]): EffectiveGrants {
  return {
    permissions: codes,
    scopesByPermission: churchWideScopesForPermissions(codes),
    actorHouseholdIds: [],
  };
}
