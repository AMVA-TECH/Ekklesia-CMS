import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadUnits(ctx: Ctx, organisationalUnitId?: string): void {
  if (!can(ctx, 'units:read', organisationalUnitId ? { organisationalUnitId } : undefined)) {
    throw forbidden();
  }
}

export function assertCanWriteUnits(ctx: Ctx, organisationalUnitId?: string): void {
  if (!can(ctx, 'units:write', organisationalUnitId ? { organisationalUnitId } : undefined)) {
    throw forbidden();
  }
}

export function assertCanWriteProgrammes(ctx: Ctx): void {
  if (!can(ctx, 'programmes:write')) {
    throw forbidden();
  }
}

export function assertCanReadPositions(ctx: Ctx): void {
  if (!can(ctx, 'positions:write') && !can(ctx, 'units:read')) {
    throw forbidden();
  }
}

export function assertCanWritePositions(ctx: Ctx): void {
  if (!can(ctx, 'positions:write')) {
    throw forbidden();
  }
}

export function assertCanReadAppointments(ctx: Ctx): void {
  if (!can(ctx, 'appointments:write') && !can(ctx, 'units:read')) {
    throw forbidden();
  }
}

export function assertCanWriteAppointments(ctx: Ctx): void {
  if (!can(ctx, 'appointments:write')) {
    throw forbidden();
  }
}
