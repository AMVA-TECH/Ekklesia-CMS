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

/**
 * Portal self-edit: own person always (locale/contact prefs), or
 * admin people:update. Own-person must not require a role permission —
 * otherwise language switching 403s when preferences:self is missing.
 */
export function assertCanEditOwnProfile(ctx: Ctx, personId: string): void {
  if (ctx.actor.personId === personId) return;
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

/** Restricted personal fields (national ID, pastoral notes, etc.). */
export function canReadRestrictedPeopleFields(ctx: Ctx): boolean {
  return can(ctx, 'people:read_restricted');
}

export function assertCanReadRestrictedPeopleFields(ctx: Ctx): void {
  if (!canReadRestrictedPeopleFields(ctx)) throw forbidden();
}
