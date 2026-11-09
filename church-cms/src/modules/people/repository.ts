import { and, asc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { memberships } from '@/modules/membership/db-schema';
import { people, personContacts } from './db-schema';

export interface InsertPersonInput {
  displayName: string;
  fullName?: string;
  dateOfBirth?: string;
  preferredLocale?: string;
  directoryOptIn?: boolean;
  phoneE164?: string;
  email?: string;
}

/**
 * List people visible in the active church via membership join.
 * church_id always from Ctx.
 */
export async function listPeopleForChurch(
  db: Db,
  ctx: Ctx,
  options: { q?: string; limit: number; cursor?: string },
) {
  const conditions = [
    eq(memberships.churchId, ctx.churchId),
    isNull(people.deletedAt),
    isNull(memberships.deletedAt),
  ];

  if (options.cursor) {
    conditions.push(gt(people.id, options.cursor));
  }
  if (options.q) {
    const pattern = `%${options.q}%`;
    conditions.push(
      or(ilike(people.displayName, pattern), ilike(people.fullName, pattern))!,
    );
  }

  return db
    .select({
      id: people.id,
      displayName: people.displayName,
      fullName: people.fullName,
      dateOfBirth: people.dateOfBirth,
      preferredLocale: people.preferredLocale,
      directoryOptIn: people.directoryOptIn,
      createdAt: people.createdAt,
    })
    .from(people)
    .innerJoin(memberships, eq(memberships.personId, people.id))
    .where(and(...conditions))
    .orderBy(asc(people.id))
    .limit(options.limit + 1);
}

export async function getPersonInChurch(db: Db, ctx: Ctx, personId: string) {
  const [row] = await db
    .select({
      id: people.id,
      displayName: people.displayName,
      fullName: people.fullName,
      dateOfBirth: people.dateOfBirth,
      preferredLocale: people.preferredLocale,
      directoryOptIn: people.directoryOptIn,
      createdAt: people.createdAt,
    })
    .from(people)
    .innerJoin(memberships, eq(memberships.personId, people.id))
    .where(
      and(
        eq(people.id, personId),
        eq(memberships.churchId, ctx.churchId),
        isNull(people.deletedAt),
        isNull(memberships.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listContactsForPerson(db: Db, personId: string) {
  return db
    .select({
      id: personContacts.id,
      channel: personContacts.channel,
      value: personContacts.value,
      isPrimary: personContacts.isPrimary,
    })
    .from(personContacts)
    .where(
      and(eq(personContacts.personId, personId), isNull(personContacts.deletedAt)),
    );
}

export async function insertPerson(db: Db, ctx: Ctx, input: InsertPersonInput) {
  const personId = newId();

  await db.insert(people).values({
    id: personId,
    displayName: input.displayName,
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth,
    preferredLocale: input.preferredLocale ?? 'sw',
    directoryOptIn: input.directoryOptIn ?? false,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });

  if (input.phoneE164) {
    await db.insert(personContacts).values({
      id: newId(),
      personId,
      channel: 'phone',
      value: input.phoneE164,
      isPrimary: true,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }

  if (input.email) {
    await db.insert(personContacts).values({
      id: newId(),
      personId,
      channel: 'email',
      value: input.email,
      isPrimary: !input.phoneE164,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }

  return personId;
}

export async function updatePersonRow(
  db: Db,
  ctx: Ctx,
  personId: string,
  patch: {
    displayName?: string;
    fullName?: string | null;
    dateOfBirth?: string | null;
    preferredLocale?: string;
    directoryOptIn?: boolean;
  },
) {
  await db
    .update(people)
    .set({
      ...patch,
      updatedAt: sql`now()`,
      updatedBy: ctx.actor.userAccountId,
    })
    .where(eq(people.id, personId));
}
