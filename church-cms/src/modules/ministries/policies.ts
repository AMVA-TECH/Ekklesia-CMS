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

/**
 * Keep only requests the caller may decide: church-wide approvers see all,
 * unit-scoped approvers (ministry leaders) see their own units.
 */
export function filterDecidableRequests<T extends { organisationalUnitId: string }>(
  ctx: Ctx,
  rows: readonly T[],
): T[] {
  return rows.filter((r) =>
    can(ctx, 'participations:approve', { organisationalUnitId: r.organisationalUnitId }),
  );
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
