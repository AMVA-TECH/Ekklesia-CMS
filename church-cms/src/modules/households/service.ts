import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { notFound } from '@/platform/errors';
import { getPersonInChurch } from '@/modules/people/repository';
import { toHouseholdResponse } from './mappers';
import { assertCanReadHouseholds, assertCanWriteHouseholds } from './policies';
import * as repo from './repository';
import type {
  AddHouseholdChildBody,
  AddHouseholdMemberBody,
  CreateHouseholdBody,
  ListHouseholdsQuery,
  UpdateHouseholdBody,
} from './schemas';

async function loadHouseholdResponse(ctx: Ctx, householdId: string) {
  const db = getDb();
  const household = await repo.getHouseholdById(db, ctx, householdId);
  if (!household) throw notFound();
  const members = await repo.listMembers(db, householdId);
  const children = await repo.listChildren(db, householdId);
  return toHouseholdResponse(household, members, children);
}

export async function listHouseholds(ctx: Ctx, query: ListHouseholdsQuery) {
  assertCanReadHouseholds(ctx);
  const db = getDb();
  const rows = await repo.listHouseholdsForChurch(db, ctx, {
    q: query.q,
    limit: query.limit,
    cursor: query.cursor,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const data = await Promise.all(
    page.map(async (row) => {
      const members = await repo.listMembers(db, row.id);
      const children = await repo.listChildren(db, row.id);
      return toHouseholdResponse(row, members, children);
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

export async function getHousehold(ctx: Ctx, householdId: string) {
  assertCanReadHouseholds(ctx);
  return loadHouseholdResponse(ctx, householdId);
}

export async function updateHousehold(
  ctx: Ctx,
  householdId: string,
  body: UpdateHouseholdBody,
) {
  assertCanWriteHouseholds(ctx);
  const db = getDb();
  const existing = await repo.getHouseholdById(db, ctx, householdId);
  if (!existing) throw notFound();

  await repo.updateHouseholdRow(db, ctx, householdId, body);
  await writeAudit(db, ctx, {
    action: 'households.household.updated',
    entityType: 'household',
    entityId: householdId,
    metadata: { fields: Object.keys(body) },
  });

  return loadHouseholdResponse(ctx, householdId);
}

export async function createHousehold(ctx: Ctx, body: CreateHouseholdBody) {
  assertCanWriteHouseholds(ctx);
  const db = getDb();

  for (const personId of body.memberPersonIds) {
    const person = await getPersonInChurch(db, ctx, personId);
    if (!person) throw notFound();
  }

  const householdId = await repo.insertHousehold(db, ctx, body);

  for (const [index, personId] of body.memberPersonIds.entries()) {
    await repo.insertHouseholdMember(db, ctx, householdId, {
      personId,
      relationship: 'member',
      isPrimaryContact: index === 0,
    });
  }

  for (const child of body.children) {
    await repo.insertHouseholdChild(db, ctx, householdId, child);
  }

  await writeAudit(db, ctx, {
    action: 'households.household.created',
    entityType: 'household',
    entityId: householdId,
  });

  return loadHouseholdResponse(ctx, householdId);
}

export async function addHouseholdMember(
  ctx: Ctx,
  householdId: string,
  body: AddHouseholdMemberBody,
) {
  assertCanWriteHouseholds(ctx);
  const db = getDb();
  const household = await repo.getHouseholdById(db, ctx, householdId);
  if (!household) throw notFound();

  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();

  await repo.insertHouseholdMember(db, ctx, householdId, body);
  await writeAudit(db, ctx, {
    action: 'households.member.added',
    entityType: 'household',
    entityId: householdId,
    metadata: { personId: body.personId },
  });

  return loadHouseholdResponse(ctx, householdId);
}

export async function addHouseholdChild(
  ctx: Ctx,
  householdId: string,
  body: AddHouseholdChildBody,
) {
  assertCanWriteHouseholds(ctx);
  const db = getDb();
  const household = await repo.getHouseholdById(db, ctx, householdId);
  if (!household) throw notFound();

  await repo.insertHouseholdChild(db, ctx, householdId, body);
  await writeAudit(db, ctx, {
    action: 'households.child.added',
    entityType: 'household',
    entityId: householdId,
    metadata: { name: body.name, age: body.age },
  });

  return loadHouseholdResponse(ctx, householdId);
}
