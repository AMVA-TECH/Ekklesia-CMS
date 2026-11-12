import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadRoles(ctx: Ctx): void {
  if (!can(ctx, 'roles:read') && !can(ctx, 'roles:assign')) {
    throw forbidden();
  }
}

export function assertCanAssignRoles(ctx: Ctx): void {
  if (!can(ctx, 'roles:assign')) throw forbidden();
}
