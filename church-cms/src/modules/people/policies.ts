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

/** Portal self-edit: own person + preferences:self, or admin people:update. */
export function assertCanEditOwnProfile(ctx: Ctx, personId: string): void {
  if (ctx.actor.personId === personId && can(ctx, 'preferences:self')) return;
  if (can(ctx, 'people:update', { personId })) return;
  throw forbidden();
}

export function assertCanReadOwnProfile(ctx: Ctx, personId: string): void {
  if (ctx.actor.personId === personId && can(ctx, 'preferences:self')) return;
  if (ctx.actor.personId === personId && can(ctx, 'people:read', { personId })) return;
  if (can(ctx, 'people:read', { personId })) return;
  throw forbidden();
}

export function assertCanReadDirectory(ctx: Ctx): void {
  if (!can(ctx, 'directory:read') && !can(ctx, 'people:read')) {
    throw forbidden();
  }
}

/** Admin people:update, or self with preferences:self / people:update. */
export function assertCanManageContacts(ctx: Ctx, personId: string): void {
  if (can(ctx, 'people:update', { personId })) return;
  if (ctx.actor.personId === personId && can(ctx, 'preferences:self')) return;
  throw forbidden();
}
