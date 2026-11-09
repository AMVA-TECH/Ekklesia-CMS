import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadPeople(ctx: Ctx, personId?: string): void {
  if (!can(ctx, 'people:read', personId ? { personId } : undefined)) {
    throw forbidden();
  }
}

export function assertCanCreatePeople(ctx: Ctx): void {
  if (!can(ctx, 'people:create')) {
    throw forbidden();
  }
}

export function assertCanUpdatePeople(ctx: Ctx, personId: string): void {
  if (!can(ctx, 'people:update', { personId })) {
    throw forbidden();
  }
}
