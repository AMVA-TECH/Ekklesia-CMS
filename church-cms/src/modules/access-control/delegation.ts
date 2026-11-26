import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { conflict, forbidden } from '@/platform/errors';
import * as repo from './repository';

const HIGH_RISK = new Set([
  'roles:assign',
  'exports:run',
  'imports:run',
  'people:delete',
  'people:read_restricted',
  'disbursements:approve',
  'journals:post',
  'journals:reverse',
  'messages:bulk_send',
  'funds:write',
  'accounts:write',
  'periods:write',
]);

export function isHighRiskPermission(code: string): boolean {
  return HIGH_RISK.has(code) || code.startsWith('platform:');
}

/**
 * Assigner may only grant a role whose permissions are a subset of their own
 * effective permissions (platform operators in tenant-enter bypass).
 */
export async function assertAssignerMayGrantRole(
  ctx: Ctx,
  roleId: string,
): Promise<void> {
  if (ctx.isPlatformOperator) return;

  const db = getDb();
  const rolePerms = await repo.listPermissionCodesForRoles(db, [roleId]);
  const codes = rolePerms.get(roleId) ?? [];
  for (const code of codes) {
    if (code.startsWith('platform:')) {
      throw forbidden();
    }
    if (!ctx.permissions.has(code)) {
      throw forbidden();
    }
  }
}

/** Same subset rule for an arbitrary permission list (role create/update). */
export function assertAssignerMayGrantPermissions(
  ctx: Ctx,
  permissionCodes: readonly string[],
): void {
  if (ctx.isPlatformOperator) return;
  for (const code of permissionCodes) {
    if (code.startsWith('platform:')) {
      throw forbidden();
    }
    if (!ctx.permissions.has(code)) {
      throw forbidden();
    }
  }
}

/**
 * Prevent revoking the last active church-scoped assignment that carries
 * roles:assign (lockout protection).
 */
export async function assertNotLastRolesAssignHolder(
  ctx: Ctx,
  assignment: {
    id: string;
    userAccountId: string;
    roleId: string;
    scopeType: string;
  },
): Promise<void> {
  const db = getDb();
  const rolePerms = await repo.listPermissionCodesForRoles(db, [
    assignment.roleId,
  ]);
  const codes = rolePerms.get(assignment.roleId) ?? [];
  if (!codes.includes('roles:assign')) return;
  if (assignment.scopeType !== 'church') return;

  const holders = await repo.countActiveChurchRolesAssignHolders(
    db,
    ctx,
    assignment.id,
  );
  if (holders <= 0) {
    throw conflict(
      'Cannot revoke the last church administrator with roles:assign.',
    );
  }
}

export { HIGH_RISK as HIGH_RISK_PERMISSIONS };
