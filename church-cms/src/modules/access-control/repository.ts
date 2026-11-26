import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  organisationUsers,
  people,
  userAccounts,
} from '@/modules/people/db-schema';
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

/** Active organisation users for role-assign pickers (no raw UUID entry). */
export async function listOrganisationUsers(db: Db, ctx: Ctx) {
  return db
    .select({
      id: organisationUsers.id,
      userAccountId: organisationUsers.userAccountId,
      personId: organisationUsers.personId,
      status: organisationUsers.status,
      displayName: people.displayName,
      email: userAccounts.email,
      phoneE164: userAccounts.phoneE164,
    })
    .from(organisationUsers)
    .innerJoin(
      userAccounts,
      eq(userAccounts.id, organisationUsers.userAccountId),
    )
    .leftJoin(people, eq(people.id, organisationUsers.personId))
    .where(
      and(
        eq(organisationUsers.churchId, ctx.churchId),
        eq(organisationUsers.status, 'active'),
        isNull(organisationUsers.deletedAt),
        isNull(userAccounts.deletedAt),
      ),
    )
    .orderBy(asc(people.displayName), asc(userAccounts.email));
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
      sourceAppointmentId: userRoleAssignments.sourceAppointmentId,
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

/** Active assignments scoped to a unit (for deactivate/reparent review). */
export async function listActiveAssignmentsForUnit(
  db: Db,
  ctx: Ctx,
  organisationalUnitId: string,
) {
  const now = new Date();
  const rows = await db
    .select({
      assignmentId: userRoleAssignments.id,
      userAccountId: userRoleAssignments.userAccountId,
      roleId: roles.id,
      roleCode: roles.code,
      roleName: roles.name,
      scopeType: userRoleAssignments.scopeType,
      organisationalUnitId: userRoleAssignments.organisationalUnitId,
      sourceAppointmentId: userRoleAssignments.sourceAppointmentId,
      effectiveFrom: userRoleAssignments.effectiveFrom,
      effectiveTo: userRoleAssignments.effectiveTo,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
    .where(
      and(
        eq(userRoleAssignments.churchId, ctx.churchId),
        eq(userRoleAssignments.organisationalUnitId, organisationalUnitId),
        eq(userRoleAssignments.scopeType, 'organisational_unit'),
        isNull(userRoleAssignments.deletedAt),
        isNull(roles.deletedAt),
      ),
    );
  return rows.filter(
    (r) =>
      r.effectiveFrom <= now &&
      (r.effectiveTo === null || r.effectiveTo > now),
  );
}

/** Assignments linked to an appointment, or same person+unit heuristic. */
export async function listAssignmentsRelatedToAppointment(
  db: Db,
  ctx: Ctx,
  input: {
    appointmentId: string;
    userAccountId: string | null;
    organisationalUnitId: string | null;
  },
) {
  const now = new Date();
  const bySource = await db
    .select({
      assignmentId: userRoleAssignments.id,
      userAccountId: userRoleAssignments.userAccountId,
      roleId: roles.id,
      roleCode: roles.code,
      roleName: roles.name,
      scopeType: userRoleAssignments.scopeType,
      organisationalUnitId: userRoleAssignments.organisationalUnitId,
      sourceAppointmentId: userRoleAssignments.sourceAppointmentId,
      effectiveFrom: userRoleAssignments.effectiveFrom,
      effectiveTo: userRoleAssignments.effectiveTo,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
    .where(
      and(
        eq(userRoleAssignments.churchId, ctx.churchId),
        eq(userRoleAssignments.sourceAppointmentId, input.appointmentId),
        isNull(userRoleAssignments.deletedAt),
        isNull(roles.deletedAt),
      ),
    );

  let heuristic: typeof bySource = [];
  if (input.userAccountId && input.organisationalUnitId) {
    heuristic = await db
      .select({
        assignmentId: userRoleAssignments.id,
        userAccountId: userRoleAssignments.userAccountId,
        roleId: roles.id,
        roleCode: roles.code,
        roleName: roles.name,
        scopeType: userRoleAssignments.scopeType,
        organisationalUnitId: userRoleAssignments.organisationalUnitId,
        sourceAppointmentId: userRoleAssignments.sourceAppointmentId,
        effectiveFrom: userRoleAssignments.effectiveFrom,
        effectiveTo: userRoleAssignments.effectiveTo,
      })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
      .where(
        and(
          eq(userRoleAssignments.churchId, ctx.churchId),
          eq(userRoleAssignments.userAccountId, input.userAccountId),
          eq(
            userRoleAssignments.organisationalUnitId,
            input.organisationalUnitId,
          ),
          eq(userRoleAssignments.scopeType, 'organisational_unit'),
          isNull(userRoleAssignments.deletedAt),
          isNull(roles.deletedAt),
        ),
      );
  }

  const byId = new Map<string, (typeof bySource)[number]>();
  for (const row of [...bySource, ...heuristic]) {
    if (
      row.effectiveFrom <= now &&
      (row.effectiveTo === null || row.effectiveTo > now)
    ) {
      byId.set(row.assignmentId, row);
    }
  }
  return [...byId.values()];
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
    sourceAppointmentId: body.sourceAppointmentId,
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

/**
 * Count other active church-scoped assignments whose role includes roles:assign,
 * excluding `exceptAssignmentId`.
 */
export async function countActiveChurchRolesAssignHolders(
  db: Db,
  ctx: Ctx,
  exceptAssignmentId: string,
): Promise<number> {
  const now = new Date();
  const rows = await db
    .select({
      id: userRoleAssignments.id,
      roleId: userRoleAssignments.roleId,
      effectiveFrom: userRoleAssignments.effectiveFrom,
      effectiveTo: userRoleAssignments.effectiveTo,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
    .where(
      and(
        eq(userRoleAssignments.churchId, ctx.churchId),
        eq(userRoleAssignments.scopeType, 'church'),
        isNull(userRoleAssignments.deletedAt),
        isNull(roles.deletedAt),
        sql`${userRoleAssignments.id} <> ${exceptAssignmentId}::uuid`,
      ),
    );

  const active = rows.filter(
    (r) =>
      r.effectiveFrom <= now &&
      (r.effectiveTo === null || r.effectiveTo > now),
  );
  if (active.length === 0) return 0;

  const permMap = await listPermissionCodesForRoles(
    db,
    active.map((r) => r.roleId),
  );
  return active.filter((r) =>
    (permMap.get(r.roleId) ?? []).includes('roles:assign'),
  ).length;
}

export async function listAllPermissions(db: Db) {
  return db
    .select()
    .from(permissions)
    .orderBy(asc(permissions.code));
}

export async function getPermissionsByCodes(db: Db, codes: string[]) {
  if (codes.length === 0) return [];
  return db
    .select()
    .from(permissions)
    .where(inArray(permissions.code, codes));
}

export async function insertRole(
  db: Db,
  ctx: Ctx,
  input: { code: string; name: string },
) {
  const id = newId();
  await db.insert(roles).values({
    id,
    churchId: ctx.churchId,
    code: input.code,
    name: input.name,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function updateRoleRow(
  db: Db,
  ctx: Ctx,
  roleId: string,
  input: { name?: string },
) {
  await db
    .update(roles)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(roles.id, roleId),
        eq(roles.churchId, ctx.churchId),
        isNull(roles.deletedAt),
      ),
    );
}

export async function deactivateRoleRow(db: Db, ctx: Ctx, roleId: string) {
  await db
    .update(roles)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(roles.id, roleId), eq(roles.churchId, ctx.churchId)),
    );
}

export async function replaceRolePermissions(
  db: Db,
  roleId: string,
  permissionIds: string[],
) {
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permissionIds.length === 0) return;
  await db.insert(rolePermissions).values(
    permissionIds.map((permissionId) => ({ roleId, permissionId })),
  );
}

export async function getRoleByCode(db: Db, ctx: Ctx, code: string) {
  const [row] = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.churchId, ctx.churchId),
        eq(roles.code, code),
        isNull(roles.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
