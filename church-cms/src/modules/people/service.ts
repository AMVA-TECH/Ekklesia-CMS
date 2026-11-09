import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { notFound } from '@/platform/errors';
import { createVisitorMembership } from '@/modules/membership/repository';
import { toPersonResponse } from './mappers';
import {
  assertCanCreatePeople,
  assertCanReadPeople,
  assertCanUpdatePeople,
} from './policies';
import type { CreatePersonBody, ListPeopleQuery, UpdatePersonBody } from './schemas';
import * as repo from './repository';

export async function listPeople(ctx: Ctx, query: ListPeopleQuery) {
  assertCanReadPeople(ctx);
  const db = getDb();
  const rows = await repo.listPeopleForChurch(db, ctx, {
    q: query.q,
    limit: query.limit,
    cursor: query.cursor,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const data = await Promise.all(
    page.map(async (row) => {
      const contacts = await repo.listContactsForPerson(db, row.id);
      return toPersonResponse(row, contacts);
    }),
  );
  return {
    data,
    meta: {
      limit: query.limit,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
    },
  };
}

export async function getPerson(ctx: Ctx, personId: string) {
  assertCanReadPeople(ctx, personId);
  const db = getDb();
  const row = await repo.getPersonInChurch(db, ctx, personId);
  if (!row) throw notFound();
  const contacts = await repo.listContactsForPerson(db, personId);
  return toPersonResponse(row, contacts);
}

export async function createPerson(ctx: Ctx, body: CreatePersonBody) {
  assertCanCreatePeople(ctx);
  const db = getDb();

  const personId = await repo.insertPerson(db, ctx, body);
  await createVisitorMembership(db, ctx, personId);
  await writeAudit(db, ctx, {
    action: 'people.person.created',
    entityType: 'person',
    entityId: personId,
  });

  const row = await repo.getPersonInChurch(db, ctx, personId);
  if (!row) throw notFound();
  const contacts = await repo.listContactsForPerson(db, personId);
  return toPersonResponse(row, contacts);
}

export async function updatePerson(ctx: Ctx, personId: string, body: UpdatePersonBody) {
  assertCanUpdatePeople(ctx, personId);
  const db = getDb();
  const existing = await repo.getPersonInChurch(db, ctx, personId);
  if (!existing) throw notFound();

  await repo.updatePersonRow(db, ctx, personId, body);
  await writeAudit(db, ctx, {
    action: 'people.person.updated',
    entityType: 'person',
    entityId: personId,
  });

  const row = await repo.getPersonInChurch(db, ctx, personId);
  if (!row) throw notFound();
  const contacts = await repo.listContactsForPerson(db, personId);
  return toPersonResponse(row, contacts);
}
