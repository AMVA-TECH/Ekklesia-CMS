import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadMemberships(ctx: Ctx): void {
  if (!can(ctx, 'memberships:read')) {
    throw forbidden();
  }
}

export function assertCanUpdateMembershipStatus(ctx: Ctx): void {
  if (!can(ctx, 'memberships:update_status') && !can(ctx, 'memberships:approve')) {
    throw forbidden();
  }
}
