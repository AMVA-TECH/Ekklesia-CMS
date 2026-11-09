import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound } from '@/platform/errors';
import { MEMBERSHIP_STATUS_TRANSITIONS, type MembershipStatus } from './constants';
import { toMembershipResponse } from './mappers';
import {
  assertCanReadMemberships,
  assertCanUpdateMembershipStatus,
} from './policies';
import * as repo from './repository';
import type { UpdateMembershipStatusBody } from './schemas';

export async function getMembershipForPerson(ctx: Ctx, personId: string) {
  assertCanReadMemberships(ctx);
  const row = await repo.getMembershipForPerson(getDb(), ctx, personId);
  if (!row) throw notFound();
  return toMembershipResponse(row);
}

export async function getMyMembership(ctx: Ctx) {
  if (!ctx.actor.personId) throw notFound();
  return getMembershipForPerson(ctx, ctx.actor.personId);
}

export async function changeMembershipStatus(
  ctx: Ctx,
  membershipId: string,
  body: UpdateMembershipStatusBody,
) {
  assertCanUpdateMembershipStatus(ctx);
  const db = getDb();
  const existing = await repo.getMembershipById(db, ctx, membershipId);
  if (!existing) throw notFound();

  const from = existing.status as MembershipStatus;
  const allowed = MEMBERSHIP_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(body.status)) {
    throw conflict(`Cannot transition membership from ${from} to ${body.status}.`);
  }

  const updated = await repo.updateMembershipStatus(
    db,
    ctx,
    membershipId,
    body.status,
    body.reason,
  );
  if (!updated) throw notFound();

  await writeAudit(db, ctx, {
    action: 'membership.status.changed',
    entityType: 'membership',
    entityId: membershipId,
    metadata: { from, to: body.status },
  });

  return toMembershipResponse(updated);
}
