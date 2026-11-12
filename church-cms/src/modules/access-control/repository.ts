import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { organisationUsers, userAccounts } from '@/modules/people/db-schema';
import {
  permissions,
  rolePermissions,
  roles,
  userRoleAssignments,
} from './db-schema';
import type { CreateRoleAssignmentBody, ListRoleAssignmentsQuery } from './schemas';

export async function listRoles(db: Db, ctx: Ctx) {
  return db
    .select()
    .from(roles)
    .where(and(eq(roles.churchId, ctx.churchId), isNull(roles.deletedAt)))
    .orderBy(asc(roles.name));
}

export async function getRoleById(db: Db, ctx: Ctx, roleId: string) {
  const [row] = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.id, roleId),
        eq(roles.churchId, ctx.churchId),
        isNull(roles.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listPermissionCodesForRoles(db: Db, roleIds: string[]) {
  if (roleIds.length === 0) return new Map<string, string[]>();
  const rows = await db
    .select({
      roleId: rolePermissions.roleId,
      code: permissions.code,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(inArray(rolePermissions.roleId, roleIds))
    .orderBy(asc(permissions.code));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.roleId) ?? [];
    list.push(row.code);
    map.set(row.roleId, list);
  }
  return map;
}

export async function getOrganisationUser(
  db: Db,
  ctx: Ctx,
  userAccountId: string,
) {
  const [row] = await db
    .select()
    .from(organisationUsers)
    .where(
      and(
        eq(organisationUsers.churchId, ctx.churchId),
        eq(organisationUsers.userAccountId, userAccountId),
        eq(organisationUsers.status, 'active'),
        isNull(organisationUsers.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getUserAccount(db: Db, userAccountId: string) {
  const [row] = await db
    .select()
    .from(userAccounts)
    .where(
      and(eq(userAccounts.id, userAccountId), isNull(userAccounts.deletedAt)),
    )
    .limit(1);
  return row ?? null;
}

export async function listActiveAssignmentsForUser(
  db: Db,
  ctx: Ctx,
  userAccountId: string,
) {
  const now = new Date();
  const rows = await db
    .select({
      assignmentId: userRoleAssignments.id,
      roleId: roles.id,
      roleCode: roles.code,
      roleName: roles.name,
      scopeType: userRoleAssignments.scopeType,
      organisationalUnitId: userRoleAssignments.organisationalUnitId,
      effectiveFrom: userRoleAssignments.effectiveFrom,
      effectiveTo: userRoleAssignments.effectiveTo,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
    .where(
      and(
        eq(userRoleAssignments.churchId, ctx.churchId),
        eq(userRoleAssignments.userAccountId, userAccountId),
        isNull(userRoleAssignments.deletedAt),
        isNull(roles.deletedAt),
      ),
    )
    .orderBy(asc(roles.name));

  return rows.filter(
    (r) =>
      r.effectiveFrom <= now &&
      (r.effectiveTo === null || r.effectiveTo > now),
  );
}

export async function listRoleAssignments(
  db: Db,
  ctx: Ctx,
  query: ListRoleAssignmentsQuery,
) {
  const conditions = [
    eq(userRoleAssignments.churchId, ctx.churchId),
    isNull(userRoleAssignments.deletedAt),
  ];
  if (query.userAccountId) {
    conditions.push(eq(userRoleAssignments.userAccountId, query.userAccountId));
  }
  if (query.roleId) {
    conditions.push(eq(userRoleAssignments.roleId, query.roleId));
  }
  return db
    .select()
    .from(userRoleAssignments)
    .where(and(...conditions))
    .orderBy(desc(userRoleAssignments.createdAt))
    .limit(query.limit);
}

export async function getRoleAssignmentById(
  db: Db,
  ctx: Ctx,
  assignmentId: string,
) {
  const [row] = await db
    .select()
    .from(userRoleAssignments)
    .where(
      and(
        eq(userRoleAssignments.id, assignmentId),
        eq(userRoleAssignments.churchId, ctx.churchId),
        isNull(userRoleAssignments.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertRoleAssignment(
  db: Db,
  ctx: Ctx,
  body: CreateRoleAssignmentBody,
) {
  const id = newId();
  await db.insert(userRoleAssignments).values({
    id,
    churchId: ctx.churchId,
    userAccountId: body.userAccountId,
    roleId: body.roleId,
    scopeType: body.scopeType,
    organisationalUnitId: body.organisationalUnitId,
    effectiveFrom: body.effectiveFrom
      ? new Date(body.effectiveFrom)
      : new Date(),
    effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function revokeRoleAssignment(
  db: Db,
  ctx: Ctx,
  assignmentId: string,
) {
  await db
    .update(userRoleAssignments)
    .set({
      effectiveTo: new Date(),
      deletedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(userRoleAssignments.id, assignmentId),
        eq(userRoleAssignments.churchId, ctx.churchId),
      ),
    );
}
