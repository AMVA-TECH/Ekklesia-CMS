import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadHouseholds(ctx: Ctx): void {
  if (!can(ctx, 'households:read')) {
    throw forbidden();
  }
}

export function assertCanWriteHouseholds(ctx: Ctx): void {
  if (!can(ctx, 'households:write')) {
    throw forbidden();
  }
}
