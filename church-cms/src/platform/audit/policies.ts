import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadAudit(ctx: Ctx): void {
  if (!can(ctx, 'audit:read')) throw forbidden();
}
