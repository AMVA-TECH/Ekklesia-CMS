import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  participationHistory,
  participationRequests,
  participations,
} from './db-schema';

export async function listParticipationsForUnit(
  db: Db,
  ctx: Ctx,
  organisationalUnitId: string,
) {
  return db
    .select()
    .from(participations)
    .where(
      and(
        eq(participations.churchId, ctx.churchId),
        eq(participations.organisationalUnitId, organisationalUnitId),
        isNull(participations.deletedAt),
      ),
    )
    .orderBy(asc(participations.effectiveFrom));
}

export async function getParticipationById(db: Db, ctx: Ctx, participationId: string) {
  const [row] = await db
    .select()
    .from(participations)
    .where(
      and(
        eq(participations.id, participationId),
        eq(participations.churchId, ctx.churchId),
        isNull(participations.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertParticipation(
  db: Db,
  ctx: Ctx,
  input: {
    organisationalUnitId: string;
    personId: string;
    roleInUnit?: string;
    effectiveFrom: string;
  },
) {
  const id = newId();
  await db.insert(participations).values({
    id,
    churchId: ctx.churchId,
    organisationalUnitId: input.organisationalUnitId,
    personId: input.personId,
    roleInUnit: input.roleInUnit,
    effectiveFrom: input.effectiveFrom,
    status: 'active',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  await db.insert(participationHistory).values({
    id: newId(),
    participationId: id,
    fromStatus: null,
    toStatus: 'active',
    changedByUserId: ctx.actor.userAccountId,
  });
  return id;
}

export async function endParticipation(
  db: Db,
  ctx: Ctx,
  participationId: string,
  effectiveTo: string,
) {
  await db
    .update(participations)
    .set({
      status: 'ended',
      effectiveTo,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(participations.id, participationId),
        eq(participations.churchId, ctx.churchId),
      ),
    );
  await db.insert(participationHistory).values({
    id: newId(),
    participationId,
    fromStatus: 'active',
    toStatus: 'ended',
    changedByUserId: ctx.actor.userAccountId,
  });
}

export async function insertParticipationRequest(
  db: Db,
  ctx: Ctx,
  organisationalUnitId: string,
  personId: string,
) {
  const id = newId();
  await db.insert(participationRequests).values({
    id,
    churchId: ctx.churchId,
    organisationalUnitId,
    personId,
    status: 'pending',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getParticipationRequestById(db: Db, ctx: Ctx, requestId: string) {
  const [row] = await db
    .select()
    .from(participationRequests)
    .where(
      and(
        eq(participationRequests.id, requestId),
        eq(participationRequests.churchId, ctx.churchId),
        isNull(participationRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listParticipationRequestsForPerson(
  db: Db,
  ctx: Ctx,
  personId: string,
  options: { status?: string; limit: number },
) {
  const conditions = [
    eq(participationRequests.churchId, ctx.churchId),
    eq(participationRequests.personId, personId),
    isNull(participationRequests.deletedAt),
  ];
  if (options.status) {
    conditions.push(eq(participationRequests.status, options.status));
  }
  return db
    .select()
    .from(participationRequests)
    .where(and(...conditions))
    .orderBy(desc(participationRequests.createdAt))
    .limit(options.limit);
}

export async function decideParticipationRequest(
  db: Db,
  ctx: Ctx,
  requestId: string,
  decision: 'approved' | 'rejected',
) {
  await db
    .update(participationRequests)
    .set({
      status: decision,
      decidedByUserId: ctx.actor.userAccountId,
      decidedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(participationRequests.id, requestId),
        eq(participationRequests.churchId, ctx.churchId),
      ),
    );
}
