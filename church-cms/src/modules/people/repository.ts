import { and, asc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { memberships } from '@/modules/membership/db-schema';
import { participations } from '@/modules/ministries/db-schema';
import { organisationalUnits } from '@/modules/organisation/db-schema';
import { organisationUsers, people, personContacts } from './db-schema';

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
      photoMediaId: people.photoMediaId,
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
      photoMediaId: people.photoMediaId,
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

export async function findPersonIdForUser(db: Db, ctx: Ctx) {
  if (ctx.actor.personId) return ctx.actor.personId;
  const [row] = await db
    .select({ personId: organisationUsers.personId })
    .from(organisationUsers)
    .where(
      and(
        eq(organisationUsers.churchId, ctx.churchId),
        eq(organisationUsers.userAccountId, ctx.actor.userAccountId),
        eq(organisationUsers.status, 'active'),
        isNull(organisationUsers.deletedAt),
      ),
    )
    .limit(1);
  return row?.personId ?? null;
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
    photoMediaId?: string | null;
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

export async function findContactByChannelValue(
  db: Db,
  personId: string,
  channel: 'phone' | 'email',
  value: string,
) {
  const [row] = await db
    .select()
    .from(personContacts)
    .where(
      and(
        eq(personContacts.personId, personId),
        eq(personContacts.channel, channel),
        eq(personContacts.value, value),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function clearPrimaryForChannel(
  db: Db,
  ctx: Ctx,
  personId: string,
  channel: 'phone' | 'email',
  exceptId?: string,
) {
  const rows = await db
    .select({ id: personContacts.id })
    .from(personContacts)
    .where(
      and(
        eq(personContacts.personId, personId),
        eq(personContacts.channel, channel),
        eq(personContacts.isPrimary, true),
        isNull(personContacts.deletedAt),
      ),
    );
  for (const row of rows) {
    if (exceptId && row.id === exceptId) continue;
    await db
      .update(personContacts)
      .set({
        isPrimary: false,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: new Date(),
      })
      .where(eq(personContacts.id, row.id));
  }
}

export async function insertOrReviveContact(
  db: Db,
  ctx: Ctx,
  personId: string,
  input: { channel: 'phone' | 'email'; value: string; isPrimary: boolean },
) {
  const existing = await findContactByChannelValue(
    db,
    personId,
    input.channel,
    input.value,
  );
  if (existing) {
    if (input.isPrimary) {
      await clearPrimaryForChannel(db, ctx, personId, input.channel, existing.id);
    }
    await db
      .update(personContacts)
      .set({
        deletedAt: null,
        isPrimary: input.isPrimary,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: new Date(),
      })
      .where(eq(personContacts.id, existing.id));
    return existing.id;
  }

  const id = newId();
  if (input.isPrimary) {
    await clearPrimaryForChannel(db, ctx, personId, input.channel);
  }
  await db.insert(personContacts).values({
    id,
    personId,
    channel: input.channel,
    value: input.value,
    isPrimary: input.isPrimary,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function upsertPrimaryContact(
  db: Db,
  ctx: Ctx,
  personId: string,
  channel: 'phone' | 'email',
  value: string | null,
) {
  const existing = await db
    .select()
    .from(personContacts)
    .where(
      and(
        eq(personContacts.personId, personId),
        eq(personContacts.channel, channel),
        isNull(personContacts.deletedAt),
      ),
    );

  if (value === null) {
    for (const row of existing) {
      await db
        .update(personContacts)
        .set({
          deletedAt: new Date(),
          updatedBy: ctx.actor.userAccountId,
          updatedAt: new Date(),
        })
        .where(eq(personContacts.id, row.id));
    }
    return;
  }

  const primary = existing.find((r) => r.isPrimary) ?? existing[0];
  if (primary) {
    await db
      .update(personContacts)
      .set({
        value,
        isPrimary: true,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: new Date(),
      })
      .where(eq(personContacts.id, primary.id));
    return;
  }

  await db.insert(personContacts).values({
    id: newId(),
    personId,
    channel,
    value,
    isPrimary: true,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
}

export async function listDirectoryOptIns(
  db: Db,
  ctx: Ctx,
  options: { q?: string; limit: number; cursor?: string },
) {
  const conditions = [
    eq(memberships.churchId, ctx.churchId),
    eq(people.directoryOptIn, true),
    isNull(people.deletedAt),
    isNull(memberships.deletedAt),
  ];
  if (options.cursor) conditions.push(gt(people.id, options.cursor));
  if (options.q) {
    const pattern = `%${options.q}%`;
    conditions.push(ilike(people.displayName, pattern));
  }

  return db
    .select({
      id: people.id,
      displayName: people.displayName,
      photoMediaId: people.photoMediaId,
    })
    .from(people)
    .innerJoin(memberships, eq(memberships.personId, people.id))
    .where(and(...conditions))
    .orderBy(asc(people.id))
    .limit(options.limit + 1);
}

export async function listActiveMinistriesForPerson(db: Db, ctx: Ctx, personId: string) {
  return db
    .select({
      organisationalUnitId: participations.organisationalUnitId,
      name: organisationalUnits.name,
      roleInUnit: participations.roleInUnit,
    })
    .from(participations)
    .innerJoin(
      organisationalUnits,
      eq(organisationalUnits.id, participations.organisationalUnitId),
    )
    .where(
      and(
        eq(participations.churchId, ctx.churchId),
        eq(participations.personId, personId),
        eq(participations.status, 'active'),
        isNull(participations.deletedAt),
        isNull(organisationalUnits.deletedAt),
      ),
    )
    .orderBy(asc(organisationalUnits.name));
}
