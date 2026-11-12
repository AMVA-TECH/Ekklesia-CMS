import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanRequestDisbursement(ctx: Ctx): void {
  if (!can(ctx, 'disbursements:request')) throw forbidden();
}

export function assertCanApproveDisbursement(ctx: Ctx): void {
  if (!can(ctx, 'disbursements:approve')) throw forbidden();
}

export function assertCanReadApprovals(ctx: Ctx): void {
  if (
    !can(ctx, 'disbursements:approve') &&
    !can(ctx, 'disbursements:request') &&
    !can(ctx, 'announcements:publish') &&
    !can(ctx, 'memberships:approve')
  ) {
    throw forbidden();
  }
}

export function assertCanReadLeadershipReports(ctx: Ctx): void {
  if (
    !can(ctx, 'memberships:read') &&
    !can(ctx, 'finance_reports:read') &&
    !can(ctx, 'units:read') &&
    !can(ctx, 'disbursements:approve')
  ) {
    throw forbidden();
  }
}

export function assertCanManageDelegations(ctx: Ctx): void {
  // SP / admin path: appointments:write or roles:assign or church:update
  if (
    !can(ctx, 'appointments:write') &&
    !can(ctx, 'roles:assign') &&
    !can(ctx, 'church:update')
  ) {
    throw forbidden();
  }
}

export function assertCanWriteBudgets(ctx: Ctx): void {
  if (!can(ctx, 'budgets:write') && !can(ctx, 'finance_reports:read')) {
    throw forbidden();
  }
}

export function assertCanReadBudgets(ctx: Ctx): void {
  if (!can(ctx, 'budgets:read') && !can(ctx, 'budgets:write') && !can(ctx, 'finance_reports:read')) {
    throw forbidden();
  }
}

export function assertCanRequestAppointment(ctx: Ctx): void {
  if (
    !can(ctx, 'appointments:write') &&
    !can(ctx, 'units:write') &&
    !can(ctx, 'church:update')
  ) {
    throw forbidden();
  }
}

export function assertCanDecideAppointment(ctx: Ctx): void {
  if (!can(ctx, 'appointments:write')) throw forbidden();
}

export function assertCanWriteMinutes(ctx: Ctx): void {
  if (
    !can(ctx, 'units:write') &&
    !can(ctx, 'church:update') &&
    !can(ctx, 'announcements:write')
  ) {
    throw forbidden();
  }
}

export function assertCanReadMinutes(ctx: Ctx): void {
  if (
    !can(ctx, 'units:read') &&
    !can(ctx, 'units:write') &&
    !can(ctx, 'church:update') &&
    !can(ctx, 'announcements:write')
  ) {
    throw forbidden();
  }
}
