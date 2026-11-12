import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadChurch(ctx: Ctx): void {
  if (!can(ctx, 'church:read') && !can(ctx, 'church:update')) {
    throw forbidden();
  }
}

export function assertCanUpdateChurch(ctx: Ctx): void {
  if (!can(ctx, 'church:update')) throw forbidden();
}
