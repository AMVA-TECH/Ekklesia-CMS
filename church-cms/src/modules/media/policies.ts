import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanUploadMedia(ctx: Ctx): void {
  if (
    !can(ctx, 'media:upload') &&
    !can(ctx, 'events:write') &&
    !can(ctx, 'people:update')
  ) {
    throw forbidden();
  }
}

export function assertCanReadMedia(ctx: Ctx): void {
  if (
    !can(ctx, 'media:upload') &&
    !can(ctx, 'events:read') &&
    !can(ctx, 'events:write') &&
    !can(ctx, 'people:read')
  ) {
    throw forbidden();
  }
}
