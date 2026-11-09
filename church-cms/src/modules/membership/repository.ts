import { and, eq, isNull, sql } from 'drizzle-orm';


import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import type { MembershipStatus, MembershipType } from './constants';
import {
  memberships,
  membershipStatusHistory,
} from './db-schema';

export async function getMembershipForPerson(
  db: Db,
  ctx: Ctx,
  personId: string,
) {
  const [row] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.churchId, ctx.churchId),
        eq(memberships.personId, personId),
        isNull(memberships.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createVisitorMembership(
  db: Db,
  ctx: Ctx,
  personId: string,
  options?: { membershipType?: MembershipType; householdId?: string },
) {
  const id = newId();
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(memberships).values({
    id,
    churchId: ctx.churchId,
    personId,
    householdId: options?.householdId,
    membershipType: options?.membershipType ?? 'individual',
    status: 'visitor',
    effectiveFrom: today,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  await db.insert(membershipStatusHistory).values({
    id: newId(),
    membershipId: id,
    fromStatus: null,
    toStatus: 'visitor',
    changedByUserId: ctx.actor.userAccountId,
    reason: 'created',
  });

  return id;
}

export async function updateMembershipStatus(
  db: Db,
  ctx: Ctx,
  membershipId: string,
  toStatus: MembershipStatus,
  reason?: string,
) {
  const [existing] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.id, membershipId),
        eq(memberships.churchId, ctx.churchId),
        isNull(memberships.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return null;

  await db
    .update(memberships)
    .set({
      status: toStatus,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(eq(memberships.id, membershipId));

  await db.insert(membershipStatusHistory).values({
    id: newId(),
    membershipId,
    fromStatus: existing.status,
    toStatus,
    changedByUserId: ctx.actor.userAccountId,
    reason,
  });

  return getMembershipById(db, ctx, membershipId);
}

export async function getMembershipById(db: Db, ctx: Ctx, membershipId: string) {
  const [row] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.id, membershipId),
        eq(memberships.churchId, ctx.churchId),
        isNull(memberships.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
