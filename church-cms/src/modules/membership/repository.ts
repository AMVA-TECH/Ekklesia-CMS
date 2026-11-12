import { and, asc, desc, eq, gt, ilike, isNull, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { people } from '@/modules/people/db-schema';
import type {
  MembershipApplicationStatus,
  MembershipDecisionOutcome,
  MembershipStatus,
  MembershipType,
} from './constants';
import {
  membershipApplications,
  membershipDecisions,
  memberships,
  membershipStatusHistory,
} from './db-schema';

export async function listMembershipsForChurch(
  db: Db,
  ctx: Ctx,
  options: { status?: MembershipStatus; q?: string; limit: number; cursor?: string },
) {
  const conditions = [
    eq(memberships.churchId, ctx.churchId),
    isNull(memberships.deletedAt),
  ];
  if (options.status) conditions.push(eq(memberships.status, options.status));
  if (options.cursor) conditions.push(gt(memberships.id, options.cursor));
  if (options.q) {
    conditions.push(
      ilike(people.displayName, `%${options.q}%`),
    );
  }

  return db
    .select({
      id: memberships.id,
      personId: memberships.personId,
      householdId: memberships.householdId,
      membershipType: memberships.membershipType,
      status: memberships.status,
      effectiveFrom: memberships.effectiveFrom,
      effectiveTo: memberships.effectiveTo,
    })
    .from(memberships)
    .innerJoin(people, eq(people.id, memberships.personId))
    .where(and(...conditions))
    .orderBy(asc(memberships.id))
    .limit(options.limit + 1);
}

export async function insertMembership(
  db: Db,
  ctx: Ctx,
  input: {
    personId: string;
    membershipType: MembershipType;
    status: MembershipStatus;
    householdId?: string;
    effectiveFrom?: string;
  },
) {
  const id = newId();
  const effectiveFrom = input.effectiveFrom ?? new Date().toISOString().slice(0, 10);
  await db.insert(memberships).values({
    id,
    churchId: ctx.churchId,
    personId: input.personId,
    householdId: input.householdId,
    membershipType: input.membershipType,
    status: input.status,
    effectiveFrom,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  await db.insert(membershipStatusHistory).values({
    id: newId(),
    membershipId: id,
    fromStatus: null,
    toStatus: input.status,
    changedByUserId: ctx.actor.userAccountId,
    reason: 'created',
  });
  return id;
}

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

export async function listMembershipStatusHistory(
  db: Db,
  ctx: Ctx,
  membershipId: string,
) {
  const membership = await getMembershipById(db, ctx, membershipId);
  if (!membership) return null;
  const rows = await db
    .select()
    .from(membershipStatusHistory)
    .where(eq(membershipStatusHistory.membershipId, membershipId))
    .orderBy(desc(membershipStatusHistory.effectiveAt))
    .limit(200);
  return { membership, rows };
}

export async function insertMembershipApplication(
  db: Db,
  ctx: Ctx,
  input: { personId: string; householdId?: string },
) {
  const id = newId();
  await db.insert(membershipApplications).values({
    id,
    churchId: ctx.churchId,
    personId: input.personId,
    householdId: input.householdId,
    status: 'pending',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function listMembershipApplications(
  db: Db,
  ctx: Ctx,
  status: MembershipApplicationStatus,
  limit: number,
) {
  return db
    .select()
    .from(membershipApplications)
    .where(
      and(
        eq(membershipApplications.churchId, ctx.churchId),
        eq(membershipApplications.status, status),
        isNull(membershipApplications.deletedAt),
      ),
    )
    .orderBy(desc(membershipApplications.createdAt))
    .limit(limit);
}

export async function getMembershipApplicationById(
  db: Db,
  ctx: Ctx,
  applicationId: string,
) {
  const [row] = await db
    .select()
    .from(membershipApplications)
    .where(
      and(
        eq(membershipApplications.id, applicationId),
        eq(membershipApplications.churchId, ctx.churchId),
        isNull(membershipApplications.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function setMembershipApplicationStatus(
  db: Db,
  ctx: Ctx,
  applicationId: string,
  status: MembershipApplicationStatus,
) {
  await db
    .update(membershipApplications)
    .set({
      status,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(membershipApplications.id, applicationId),
        eq(membershipApplications.churchId, ctx.churchId),
      ),
    );
}

export async function insertMembershipDecision(
  db: Db,
  ctx: Ctx,
  applicationId: string,
  outcome: MembershipDecisionOutcome,
  reason?: string,
) {
  const id = newId();
  await db.insert(membershipDecisions).values({
    id,
    applicationId,
    decidedByUserId: ctx.actor.userAccountId,
    outcome,
    reason,
  });
  return id;
}

/** Activate or create membership for an approved application. */
export async function activateMembershipForPerson(
  db: Db,
  ctx: Ctx,
  personId: string,
  householdId: string | null | undefined,
  reason?: string,
) {
  const existing = await getMembershipForPerson(db, ctx, personId);
  const today = new Date().toISOString().slice(0, 10);

  if (!existing) {
    const id = newId();
    await db.insert(memberships).values({
      id,
      churchId: ctx.churchId,
      personId,
      householdId: householdId ?? undefined,
      membershipType: 'individual',
      status: 'active',
      effectiveFrom: today,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
    await db.insert(membershipStatusHistory).values({
      id: newId(),
      membershipId: id,
      fromStatus: null,
      toStatus: 'active',
      changedByUserId: ctx.actor.userAccountId,
      reason: reason ?? 'application_approved',
    });
    return id;
  }

  if (existing.status !== 'active') {
    await db
      .update(memberships)
      .set({
        status: 'active',
        householdId: householdId ?? existing.householdId,
        effectiveFrom: today,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: sql`now()`,
      })
      .where(eq(memberships.id, existing.id));
    await db.insert(membershipStatusHistory).values({
      id: newId(),
      membershipId: existing.id,
      fromStatus: existing.status,
      toStatus: 'active',
      changedByUserId: ctx.actor.userAccountId,
      reason: reason ?? 'application_approved',
    });
  } else if (householdId && householdId !== existing.householdId) {
    await db
      .update(memberships)
      .set({
        householdId,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: sql`now()`,
      })
      .where(eq(memberships.id, existing.id));
  }

  return existing.id;
}
