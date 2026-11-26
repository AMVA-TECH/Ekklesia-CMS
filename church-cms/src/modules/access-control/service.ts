import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { withTenantTx } from '@/platform/db/with-tenant';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { getUnitById } from '@/modules/organisation/repository';
import { toRoleAssignmentResponse, toRoleResponse } from './mappers';
import { assertCanAssignRoles, assertCanReadRoles } from './policies';
import type {
  ApplyRoleTemplatesBody,
  CreateRoleAssignmentBody,
  CreateRoleBody,
  DuplicateRoleBody,
  ListRoleAssignmentsQuery,
  ListRolesQuery,
  UpdateRoleBody,
  UpdateRolePermissionsBody,
} from './schemas';
import * as repo from './repository';
import {
  assertAssignerMayGrantPermissions,
  assertAssignerMayGrantRole,
  assertNotLastRolesAssignHolder,
  isHighRiskPermission,
} from './delegation';
import {
  getPermissionMeta,
  listChurchPermissionCatalogue,
} from './permission-catalogue';
import {
  getRoleTemplate,
  ROLE_TEMPLATES,
} from '@/modules/platform-ops/role-bootstrap';
import { listEffectiveGrants } from '@/platform/auth/permissions-for-user';
import { diffPermissionSets } from './template-diff';
import type { CompareRoleTemplatesBody } from './schemas';
import type { RoleScopeType } from './constants';
import { getAppointmentById } from '@/modules/organisation/repository';
import * as orgRepo from '@/modules/organisation/repository';

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

function organisationUserLabel(row: {
  displayName: string | null;
  email: string | null;
  phoneE164: string | null;
}): string {
  const name = row.displayName?.trim();
  if (name) return name;
  if (row.email) return row.email;
  if (row.phoneE164) return row.phoneE164;
  return 'Signed-in user';
}

/** Active church users for assign-role pickers. */
export async function listOrganisationUsers(ctx: Ctx) {
  assertCanReadRoles(ctx);
  const rows = await repo.listOrganisationUsers(getDb(), ctx);
  return {
    data: rows.map((row) => ({
      id: row.id,
      userAccountId: row.userAccountId,
      personId: row.personId,
      status: row.status,
      label: organisationUserLabel(row),
      email: row.email,
      phoneE164: row.phoneE164,
    })),
  };
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

  if (body.scopeType === 'organisational_unit') {
    if (!body.organisationalUnitId) {
      throw validationFailed([
        {
          field: 'organisationalUnitId',
          code: 'required',
          message: 'organisationalUnitId is required for organisational_unit scope',
        },
      ]);
    }
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit || unit.status !== 'active') {
      throw validationFailed([
        {
          field: 'organisationalUnitId',
          code: 'inactive_or_missing',
          message: 'Scope unit must be an active organisational unit in this church',
        },
      ]);
    }
  } else if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }

  const template = getRoleTemplate(role.code);
  if (template) {
    const allowed = template.allowedScopes as readonly RoleScopeType[];
    if (!allowed.includes(body.scopeType as RoleScopeType)) {
      throw validationFailed([
        {
          field: 'scopeType',
          code: 'scope_not_allowed',
          message: `Role ${role.code} does not allow scope ${body.scopeType}`,
        },
      ]);
    }
  }

  if (body.sourceAppointmentId) {
    const appointment = await getAppointmentById(
      db,
      ctx,
      body.sourceAppointmentId,
    );
    if (!appointment) throw notFound();
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

  await assertAssignerMayGrantRole(ctx, role.id);

  const id = await withTenantTx(ctx.churchId, async (tx) => {
    const assignmentId = await repo.insertRoleAssignment(tx, ctx, body);
    await writeAudit(tx, ctx, {
      action: 'access.role_assignment.created',
      entityType: 'user_role_assignment',
      entityId: assignmentId,
      metadata: {
        userAccountId: body.userAccountId,
        roleId: body.roleId,
        roleCode: role.code,
        scopeType: body.scopeType,
        sourceAppointmentId: body.sourceAppointmentId ?? null,
      },
    });
    return assignmentId;
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

  await assertNotLastRolesAssignHolder(ctx, existing);

  await withTenantTx(ctx.churchId, async (tx) => {
    await repo.revokeRoleAssignment(tx, ctx, assignmentId);
    await writeAudit(tx, ctx, {
      action: 'access.role_assignment.revoked',
      entityType: 'user_role_assignment',
      entityId: assignmentId,
      metadata: {
        userAccountId: existing.userAccountId,
        roleId: existing.roleId,
        scopeType: existing.scopeType,
      },
    });
  });
  return { id: assignmentId, status: 'revoked' as const };
}

export async function listPermissionsCatalogue(ctx: Ctx) {
  assertCanReadRoles(ctx);
  return {
    data: listChurchPermissionCatalogue().map((p) => ({
      code: p.code,
      module: p.module,
      description: p.description,
      sensitivity: p.sensitivity,
    })),
  };
}

export async function listRoleTemplates(ctx: Ctx) {
  assertCanReadRoles(ctx);
  return {
    data: ROLE_TEMPLATES.map((t) => ({
      code: t.code,
      name: t.name,
      description: t.description,
      permissions: [...t.permissions],
      allowedScopes: [...t.allowedScopes],
      bootstrap: t.bootstrap,
    })),
  };
}

/**
 * Dry-run rematrix: compare church role permissions to platform templates.
 * Does not mutate. Use applyRoleTemplates({ confirm: true }) to apply.
 */
export async function compareRoleTemplates(
  ctx: Ctx,
  body: CompareRoleTemplatesBody = {},
) {
  assertCanReadRoles(ctx);
  const db = getDb();

  const selected =
    body.codes && body.codes.length > 0
      ? ROLE_TEMPLATES.filter((t) => body.codes!.includes(t.code))
      : ROLE_TEMPLATES.filter((t) => t.bootstrap);

  const data: Array<{
    code: string;
    roleId: string | null;
    status: 'in_sync' | 'drift' | 'missing';
    previous: string[];
    next: string[];
    added: string[];
    removed: string[];
  }> = [];

  for (const template of selected) {
    const role = await repo.getRoleByCode(db, ctx, template.code);
    if (!role) {
      data.push({
        code: template.code,
        roleId: null,
        status: 'missing',
        previous: [],
        next: [...template.permissions],
        added: [...template.permissions],
        removed: [],
      });
      continue;
    }

    const previousMap = await repo.listPermissionCodesForRoles(db, [role.id]);
    const previous = previousMap.get(role.id) ?? [];
    const next = [...template.permissions];
    const diff = diffPermissionSets(previous, next);
    data.push({
      code: template.code,
      roleId: role.id,
      status: diff.inSync ? 'in_sync' : 'drift',
      previous,
      next,
      added: diff.added,
      removed: diff.removed,
    });
  }

  return {
    data,
    meta: {
      driftCount: data.filter((r) => r.status === 'drift').length,
      missingCount: data.filter((r) => r.status === 'missing').length,
      inSyncCount: data.filter((r) => r.status === 'in_sync').length,
    },
  };
}

export async function getRole(ctx: Ctx, roleId: string) {
  assertCanReadRoles(ctx);
  const db = getDb();
  const row = await repo.getRoleById(db, ctx, roleId);
  if (!row) throw notFound();
  const permissionMap = await repo.listPermissionCodesForRoles(db, [row.id]);
  const template = getRoleTemplate(row.code);
  return {
    ...toRoleResponse(row, permissionMap.get(row.id) ?? []),
    templateCode: template?.code ?? null,
    allowedScopes: template?.allowedScopes ?? [
      'church',
      'organisational_unit',
      'self',
      'household',
    ],
  };
}

export async function createRole(ctx: Ctx, body: CreateRoleBody) {
  assertCanAssignRoles(ctx);
  assertAssignerMayGrantPermissions(ctx, body.permissions);

  const highRisk = body.permissions.filter(isHighRiskPermission);
  if (highRisk.length > 0) {
    // Creation with high-risk perms is allowed when assigner already holds them;
    // audit will record the codes.
  }

  const db = getDb();
  const existing = await repo.getRoleByCode(db, ctx, body.code);
  if (existing) {
    throw conflict('A role with this code already exists.');
  }

  const permRows = await repo.getPermissionsByCodes(db, body.permissions);
  if (permRows.length !== body.permissions.length) {
    throw validationFailed([
      {
        field: 'permissions',
        code: 'unknown_permission',
        message: 'One or more permission codes are not in the catalogue',
      },
    ]);
  }
  for (const code of body.permissions) {
    if (code.startsWith('platform:')) {
      throw forbiddenPlatformPermission();
    }
  }

  const id = await withTenantTx(ctx.churchId, async (tx) => {
    const roleId = await repo.insertRole(tx, ctx, {
      code: body.code,
      name: body.name,
    });
    await repo.replaceRolePermissions(
      tx,
      roleId,
      permRows.map((p) => p.id),
    );
    await writeAudit(tx, ctx, {
      action: 'access.role.created',
      entityType: 'role',
      entityId: roleId,
      metadata: {
        code: body.code,
        permissions: body.permissions,
        highRisk,
      },
    });
    return roleId;
  });

  return getRole(ctx, id);
}

function forbiddenPlatformPermission(): never {
  throw validationFailed([
    {
      field: 'permissions',
      code: 'platform_forbidden',
      message: 'Platform permissions cannot be granted on church roles',
    },
  ]);
}

export async function updateRole(
  ctx: Ctx,
  roleId: string,
  body: UpdateRoleBody,
) {
  assertCanAssignRoles(ctx);
  const db = getDb();
  const existing = await repo.getRoleById(db, ctx, roleId);
  if (!existing) throw notFound();

  await withTenantTx(ctx.churchId, async (tx) => {
    await repo.updateRoleRow(tx, ctx, roleId, body);
    await writeAudit(tx, ctx, {
      action: 'access.role.updated',
      entityType: 'role',
      entityId: roleId,
      metadata: { name: body.name ?? existing.name },
    });
  });
  return getRole(ctx, roleId);
}

export async function updateRolePermissions(
  ctx: Ctx,
  roleId: string,
  body: UpdateRolePermissionsBody,
) {
  assertCanAssignRoles(ctx);
  assertAssignerMayGrantPermissions(ctx, body.permissions);

  const highRisk = body.permissions.filter(isHighRiskPermission);
  if (highRisk.length > 0 && body.confirmHighRisk !== true) {
    throw validationFailed([
      {
        field: 'confirmHighRisk',
        code: 'confirmation_required',
        message: 'Confirm high-risk permission changes',
      },
    ]);
  }

  const db = getDb();
  const existing = await repo.getRoleById(db, ctx, roleId);
  if (!existing) throw notFound();

  for (const code of body.permissions) {
    if (code.startsWith('platform:')) {
      throw forbiddenPlatformPermission();
    }
  }

  const permRows = await repo.getPermissionsByCodes(db, body.permissions);
  if (permRows.length !== body.permissions.length) {
    throw validationFailed([
      {
        field: 'permissions',
        code: 'unknown_permission',
        message: 'One or more permission codes are not in the catalogue',
      },
    ]);
  }

  const previous = await repo.listPermissionCodesForRoles(db, [roleId]);

  await withTenantTx(ctx.churchId, async (tx) => {
    await repo.replaceRolePermissions(
      tx,
      roleId,
      permRows.map((p) => p.id),
    );
    await writeAudit(tx, ctx, {
      action: 'access.role.permissions_updated',
      entityType: 'role',
      entityId: roleId,
      metadata: {
        previous: previous.get(roleId) ?? [],
        next: body.permissions,
        highRisk,
      },
    });
  });

  return getRole(ctx, roleId);
}

export async function duplicateRole(
  ctx: Ctx,
  roleId: string,
  body: DuplicateRoleBody,
) {
  assertCanAssignRoles(ctx);
  const db = getDb();
  const source = await repo.getRoleById(db, ctx, roleId);
  if (!source) throw notFound();

  const permissionMap = await repo.listPermissionCodesForRoles(db, [roleId]);
  const permissions = permissionMap.get(roleId) ?? [];
  return createRole(ctx, {
    code: body.code,
    name: body.name,
    permissions,
  });
}

export async function deactivateRole(ctx: Ctx, roleId: string) {
  assertCanAssignRoles(ctx);
  const db = getDb();
  const existing = await repo.getRoleById(db, ctx, roleId);
  if (!existing) throw notFound();

  await withTenantTx(ctx.churchId, async (tx) => {
    await repo.deactivateRoleRow(tx, ctx, roleId);
    await writeAudit(tx, ctx, {
      action: 'access.role.deactivated',
      entityType: 'role',
      entityId: roleId,
      metadata: { code: existing.code },
    });
  });
  return { id: roleId, status: 'deactivated' as const };
}

export async function getMemberAccess(ctx: Ctx, userAccountId: string) {
  assertCanReadRoles(ctx);
  const db = getDb();
  const orgUser = await repo.getOrganisationUser(db, ctx, userAccountId);
  if (!orgUser) throw notFound();

  const assignments = await repo.listActiveAssignmentsForUser(
    db,
    ctx,
    userAccountId,
  );
  const grants = await listEffectiveGrants(
    db,
    ctx.churchId,
    userAccountId,
    orgUser.personId,
  );

  const effective = grants.permissions.map((code) => {
    const meta = getPermissionMeta(code);
    const scopes = grants.scopesByPermission.get(code) ?? [];
    return {
      code,
      module: meta?.module ?? 'unknown',
      description: meta?.description ?? code,
      sensitivity: meta?.sensitivity ?? 'standard',
      scopes,
    };
  });

  const leadershipAppointments = orgUser.personId
    ? (
        await orgRepo.listAppointments(db, ctx, {
          personId: orgUser.personId,
          limit: 50,
        })
      ).map((a) => ({
        id: a.id,
        positionId: a.positionId,
        organisationalUnitId: a.organisationalUnitId,
        appointmentKind: a.appointmentKind,
        status: a.status,
        effectiveFrom: a.effectiveFrom,
        effectiveTo: a.effectiveTo,
      }))
    : [];

  return {
    userAccountId,
    personId: orgUser.personId,
    assignments: assignments.map((a) => ({
      id: a.assignmentId,
      roleId: a.roleId,
      roleCode: a.roleCode,
      roleName: a.roleName,
      scopeType: a.scopeType,
      organisationalUnitId: a.organisationalUnitId,
      sourceAppointmentId: a.sourceAppointmentId ?? null,
      effectiveFrom: a.effectiveFrom.toISOString(),
      effectiveTo: a.effectiveTo ? a.effectiveTo.toISOString() : null,
    })),
    appointments: leadershipAppointments,
    effectivePermissions: effective,
  };
}

/** Active unit-scoped assignments for structural-change review. */
export async function listUnitAccessImpact(ctx: Ctx, unitId: string) {
  assertCanReadRoles(ctx);
  const db = getDb();
  const unit = await getUnitById(db, ctx, unitId);
  if (!unit) throw notFound();
  const assignments = await repo.listActiveAssignmentsForUnit(db, ctx, unitId);
  return {
    unitId,
    assignments: assignments.map((a) => ({
      id: a.assignmentId,
      userAccountId: a.userAccountId,
      roleCode: a.roleCode,
      roleName: a.roleName,
      scopeType: a.scopeType,
      organisationalUnitId: a.organisationalUnitId,
      sourceAppointmentId: a.sourceAppointmentId ?? null,
    })),
  };
}

/**
 * Explicit rematrix: replace matching church role permissions with the current
 * platform template baseline. Requires confirm:true. Does not create missing roles.
 */
export async function applyRoleTemplates(
  ctx: Ctx,
  body: ApplyRoleTemplatesBody,
) {
  assertCanAssignRoles(ctx);
  const db = getDb();

  const selected =
    body.codes && body.codes.length > 0
      ? ROLE_TEMPLATES.filter((t) => body.codes!.includes(t.code))
      : ROLE_TEMPLATES.filter((t) => t.bootstrap);

  const results: Array<{
    code: string;
    roleId: string | null;
    status: 'updated' | 'missing' | 'skipped';
    previous: string[];
    next: string[];
  }> = [];

  for (const template of selected) {
    const role = await repo.getRoleByCode(db, ctx, template.code);
    if (!role) {
      results.push({
        code: template.code,
        roleId: null,
        status: 'missing',
        previous: [],
        next: [...template.permissions],
      });
      continue;
    }

    const previousMap = await repo.listPermissionCodesForRoles(db, [role.id]);
    const previous = previousMap.get(role.id) ?? [];
    const next = [...template.permissions];

    assertAssignerMayGrantPermissions(ctx, next);

    const permRows = await repo.getPermissionsByCodes(db, next);
    if (permRows.length !== next.length) {
      throw validationFailed([
        {
          field: 'codes',
          code: 'unknown_permission',
          message: `Template ${template.code} references unknown permission codes`,
        },
      ]);
    }

    await withTenantTx(ctx.churchId, async (tx) => {
      await repo.replaceRolePermissions(
        tx,
        role.id,
        permRows.map((p) => p.id),
      );
      await writeAudit(tx, ctx, {
        action: 'access.role.template_applied',
        entityType: 'role',
        entityId: role.id,
        metadata: {
          templateCode: template.code,
          previous,
          next,
        },
      });
    });

    results.push({
      code: template.code,
      roleId: role.id,
      status: 'updated',
      previous,
      next,
    });
  }

  return { data: results };
}
