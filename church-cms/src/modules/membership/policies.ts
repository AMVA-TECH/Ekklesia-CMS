import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadMemberships(ctx: Ctx): void {
  if (!can(ctx, 'memberships:read')) {
    throw forbidden();
  }
}

export function assertCanCreateMemberships(ctx: Ctx): void {
  if (
    !can(ctx, 'memberships:create') &&
    !can(ctx, 'memberships:update_status') &&
    !can(ctx, 'memberships:approve')
  ) {
    throw forbidden();
  }
}

export function assertCanUpdateMembershipStatus(ctx: Ctx): void {
  if (!can(ctx, 'memberships:update_status') && !can(ctx, 'memberships:approve')) {
    throw forbidden();
  }
}

export function assertCanApproveMemberships(ctx: Ctx): void {
  if (!can(ctx, 'memberships:approve')) {
    throw forbidden();
  }
}

/** Self-apply always allowed when actor has personId; staff may apply on behalf. */
export function assertCanCreateMembershipApplication(
  ctx: Ctx,
  targetPersonId: string,
): void {
  if (ctx.actor.personId && ctx.actor.personId === targetPersonId) {
    return;
  }
  if (can(ctx, 'memberships:update_status') || can(ctx, 'memberships:approve')) {
    return;
  }
  throw forbidden();
}
