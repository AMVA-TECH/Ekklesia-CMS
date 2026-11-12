import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadEvents(ctx: Ctx): void {
  if (!can(ctx, 'events:read')) throw forbidden();
}

export function assertCanWriteEvents(ctx: Ctx): void {
  if (!can(ctx, 'events:write')) throw forbidden();
}

export function assertCanRegisterForEvents(ctx: Ctx): void {
  if (!can(ctx, 'events:register') && !can(ctx, 'events:write')) {
    throw forbidden();
  }
}

export function assertCanListRegistrations(ctx: Ctx): void {
  if (!can(ctx, 'events:read') && !can(ctx, 'events:write')) {
    throw forbidden();
  }
}

export function assertCanReadAttendance(ctx: Ctx): void {
  if (!can(ctx, 'attendance:read')) throw forbidden();
}

export function assertCanRecordAttendance(ctx: Ctx): void {
  if (!can(ctx, 'attendance:record')) throw forbidden();
}

export function assertCanIssueAbsenceNotice(ctx: Ctx): void {
  if (!can(ctx, 'attendance:absence_notice') && !can(ctx, 'attendance:record')) {
    throw forbidden();
  }
}

export function assertCanCheckInSelf(ctx: Ctx): void {
  if (
    !can(ctx, 'attendance:check_in_self') &&
    !can(ctx, 'attendance:record')
  ) {
    throw forbidden();
  }
}

export function assertCanRequestCorrection(ctx: Ctx): void {
  if (
    !can(ctx, 'attendance:correct_request') &&
    !can(ctx, 'attendance:check_in_self') &&
    !can(ctx, 'attendance:record')
  ) {
    throw forbidden();
  }
}

export function assertCanResolveCorrection(ctx: Ctx): void {
  if (!can(ctx, 'attendance:correct_resolve') && !can(ctx, 'attendance:record')) {
    throw forbidden();
  }
}

/** Own attendance calendar / progress (account holders). */
export function assertCanReadOwnAttendance(ctx: Ctx): void {
  if (
    !can(ctx, 'attendance:check_in_self') &&
    !can(ctx, 'attendance:absence_notice') &&
    !can(ctx, 'attendance:read') &&
    !can(ctx, 'attendance:record')
  ) {
    throw forbidden();
  }
}

export function assertCanReadFamilyAttendance(ctx: Ctx): void {
  if (
    !can(ctx, 'attendance:check_in_self') &&
    !can(ctx, 'attendance:absence_notice') &&
    !can(ctx, 'attendance:read') &&
    !can(ctx, 'attendance:stats_leadership') &&
    !can(ctx, 'households:read')
  ) {
    throw forbidden();
  }
}

export function assertCanReadLeadershipAttendanceStats(ctx: Ctx): void {
  if (!can(ctx, 'attendance:stats_leadership')) throw forbidden();
}
