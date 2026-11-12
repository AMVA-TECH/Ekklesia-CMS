import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { getUnitById } from '@/modules/organisation/repository';
import { toRoleAssignmentResponse, toRoleResponse } from './mappers';
import { assertCanAssignRoles, assertCanReadRoles } from './policies';
import type {
  CreateRoleAssignmentBody,
  ListRoleAssignmentsQuery,
  ListRolesQuery,
} from './schemas';
import * as repo from './repository';

export async function listRoles(ctx: Ctx, query: ListRolesQuery) {
  assertCanReadRoles(ctx);
  const db = getDb();
  const rows = await repo.listRoles(db, ctx);
  const permissionMap = query.includePermissions
    ? await repo.listPermissionCodesForRoles(
        db,
        rows.map((r) => r.id),
      )
    : new Map<string, string[]>();
  return {
    data: rows.map((row) =>
      toRoleResponse(row, permissionMap.get(row.id) ?? []),
    ),
  };
}

export async function listRoleAssignments(
  ctx: Ctx,
  query: ListRoleAssignmentsQuery,
) {
  assertCanReadRoles(ctx);
  const rows = await repo.listRoleAssignments(getDb(), ctx, query);
  return { data: rows.map(toRoleAssignmentResponse) };
}

export async function createRoleAssignment(
  ctx: Ctx,
  body: CreateRoleAssignmentBody,
) {
  assertCanAssignRoles(ctx);
  const db = getDb();

  const role = await repo.getRoleById(db, ctx, body.roleId);
  if (!role) throw notFound();

  const account = await repo.getUserAccount(db, body.userAccountId);
  if (!account) throw notFound();

  const orgUser = await repo.getOrganisationUser(db, ctx, body.userAccountId);
  if (!orgUser) {
    throw validationFailed([
      {
        field: 'userAccountId',
        code: 'not_in_church',
        message: 'User is not an active organisation user in this church',
      },
    ]);
  }

  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }

  if (body.effectiveTo && body.effectiveFrom) {
    if (new Date(body.effectiveTo) <= new Date(body.effectiveFrom)) {
      throw validationFailed([
        {
          field: 'effectiveTo',
          code: 'invalid_range',
          message: 'effectiveTo must be after effectiveFrom',
        },
      ]);
    }
  }

  // Block duplicate active same role+scope for user
  const existing = await repo.listRoleAssignments(db, ctx, {
    userAccountId: body.userAccountId,
    roleId: body.roleId,
    limit: 50,
  });
  const duplicate = existing.find(
    (a) =>
      a.scopeType === body.scopeType &&
      (a.organisationalUnitId ?? null) ===
        (body.organisationalUnitId ?? null) &&
      (!a.effectiveTo || a.effectiveTo > new Date()),
  );
  if (duplicate) {
    throw conflict('An active assignment for this role and scope already exists.');
  }

  const id = await repo.insertRoleAssignment(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'access.role_assignment.created',
    entityType: 'user_role_assignment',
    entityId: id,
    metadata: {
      userAccountId: body.userAccountId,
      roleId: body.roleId,
      roleCode: role.code,
      scopeType: body.scopeType,
    },
  });
  const row = await repo.getRoleAssignmentById(db, ctx, id);
  if (!row) throw notFound();
  return toRoleAssignmentResponse(row);
}

export async function revokeRoleAssignment(ctx: Ctx, assignmentId: string) {
  assertCanAssignRoles(ctx);
  const db = getDb();
  const existing = await repo.getRoleAssignmentById(db, ctx, assignmentId);
  if (!existing) throw notFound();

  await repo.revokeRoleAssignment(db, ctx, assignmentId);
  await writeAudit(db, ctx, {
    action: 'access.role_assignment.revoked',
    entityType: 'user_role_assignment',
    entityId: assignmentId,
    metadata: {
      userAccountId: existing.userAccountId,
      roleId: existing.roleId,
      scopeType: existing.scopeType,
    },
  });
  return { id: assignmentId, status: 'revoked' as const };
}
