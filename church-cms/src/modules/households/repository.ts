import { and, asc, eq, gt, ilike, isNull } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  householdChildren,
  householdMembers,
  households,
} from './db-schema';

export async function listHouseholdsForChurch(
  db: Db,
  ctx: Ctx,
  options: { q?: string; limit: number; cursor?: string },
) {
  const conditions = [
    eq(households.churchId, ctx.churchId),
    isNull(households.deletedAt),
  ];
  if (options.cursor) conditions.push(gt(households.id, options.cursor));
  if (options.q) conditions.push(ilike(households.label, `%${options.q}%`));

  return db
    .select({
      id: households.id,
      label: households.label,
      sharedAddress: households.sharedAddress,
      emergencyContactName: households.emergencyContactName,
      emergencyContactPhone: households.emergencyContactPhone,
    })
    .from(households)
    .where(and(...conditions))
    .orderBy(asc(households.id))
    .limit(options.limit + 1);
}

export async function getHouseholdById(db: Db, ctx: Ctx, householdId: string) {
  const [row] = await db
    .select()
    .from(households)
    .where(
      and(
        eq(households.id, householdId),
        eq(households.churchId, ctx.churchId),
        isNull(households.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listMembers(db: Db, householdId: string) {
  return db
    .select({
      id: householdMembers.id,
      personId: householdMembers.personId,
      relationship: householdMembers.relationship,
      isPrimaryContact: householdMembers.isPrimaryContact,
    })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
      ),
    );
}

export async function listChildren(db: Db, householdId: string) {
  return db
    .select({
      id: householdChildren.id,
      name: householdChildren.name,
      age: householdChildren.age,
    })
    .from(householdChildren)
    .where(
      and(
        eq(householdChildren.householdId, householdId),
        isNull(householdChildren.deletedAt),
      ),
    );
}

export async function insertHousehold(
  db: Db,
  ctx: Ctx,
  input: {
    label: string;
    sharedAddress?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  },
) {
  const id = newId();
  await db.insert(households).values({
    id,
    churchId: ctx.churchId,
    label: input.label,
    sharedAddress: input.sharedAddress,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function insertHouseholdMember(
  db: Db,
  ctx: Ctx,
  householdId: string,
  input: { personId: string; relationship: string; isPrimaryContact?: boolean },
) {
  const id = newId();
  await db.insert(householdMembers).values({
    id,
    householdId,
    personId: input.personId,
    relationship: input.relationship,
    isPrimaryContact: input.isPrimaryContact ?? false,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function insertHouseholdChild(
  db: Db,
  ctx: Ctx,
  householdId: string,
  input: { name: string; age: number },
) {
  const id = newId();
  await db.insert(householdChildren).values({
    id,
    householdId,
    name: input.name,
    age: input.age,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function updateHouseholdRow(
  db: Db,
  ctx: Ctx,
  householdId: string,
  patch: {
    label?: string;
    sharedAddress?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  },
) {
  await db
    .update(households)
    .set({
      ...patch,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(households.id, householdId),
        eq(households.churchId, ctx.churchId),
        isNull(households.deletedAt),
      ),
    );
}
