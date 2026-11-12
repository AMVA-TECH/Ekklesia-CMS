import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadParticipations(
  ctx: Ctx,
  organisationalUnitId?: string,
): void {
  if (
    !can(ctx, 'participations:read', organisationalUnitId ? { organisationalUnitId } : undefined)
  ) {
    throw forbidden();
  }
}

export function assertCanRequestParticipation(ctx: Ctx): void {
  if (!can(ctx, 'participations:request')) {
    throw forbidden();
  }
}

export function assertCanApproveParticipations(
  ctx: Ctx,
  organisationalUnitId?: string,
): void {
  if (
    !can(
      ctx,
      'participations:approve',
      organisationalUnitId ? { organisationalUnitId } : undefined,
    )
  ) {
    throw forbidden();
  }
}
