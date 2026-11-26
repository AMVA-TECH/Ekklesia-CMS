import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { notFound, validationFailed } from '@/platform/errors';
import { createVisitorMembership } from '@/modules/membership/repository';
import { toPersonResponse } from './mappers';
import {
  assertCanCreatePeople,
  assertCanEditOwnProfile,
  assertCanManageContacts,
  assertCanReadDirectory,
  assertCanReadOwnProfile,
  assertCanReadPeople,
  assertCanUpdatePeople,
  canReadRestrictedPeopleFields,
} from './policies';
import type {
  CreatePersonBody,
  CreatePersonContactBody,
  ListDirectoryQuery,
  ListPeopleQuery,
  UpdateMyProfileBody,
  UpdatePersonBody,
} from './schemas';
import * as repo from './repository';

async function requireActorPersonId(ctx: Ctx): Promise<string> {
  const personId = await repo.findPersonIdForUser(getDb(), ctx);
  if (!personId) {
    throw validationFailed([
      {
        field: 'personId',
        code: 'required',
        message: 'No person linked to this account for the active church',
      },
    ]);
  }
  return personId;
}

function personDtoOptions(ctx: Ctx, personId: string) {
  const isSelf = ctx.actor.personId === personId;
  return {
    includeRestricted: isSelf || canReadRestrictedPeopleFields(ctx),
  };
}

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
      return toPersonResponse(row, contacts, personDtoOptions(ctx, row.id));
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
  return toPersonResponse(row, contacts, personDtoOptions(ctx, personId));
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
  return toPersonResponse(row, contacts, personDtoOptions(ctx, personId));
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
  return toPersonResponse(row, contacts, personDtoOptions(ctx, personId));
}

export async function getMyProfile(ctx: Ctx) {
  const personId = await requireActorPersonId(ctx);
  assertCanReadOwnProfile(ctx, personId);
  const db = getDb();
  const row = await repo.getPersonInChurch(db, ctx, personId);
  if (!row) throw notFound();
  const contacts = await repo.listContactsForPerson(db, personId);
  return toPersonResponse(row, contacts, { includeRestricted: true });
}

export async function updateMyProfile(ctx: Ctx, body: UpdateMyProfileBody) {
  // requireActorPersonId resolves the org-linked person — that is self by
  // definition. Do not gate on preferences:self / actor.personId claim: admin
  // sessions sometimes omit personId on claims while still having an org link,
  // which 403'd language switching after the cookie was set.
  const personId = await requireActorPersonId(ctx);
  if (ctx.actor.personId && ctx.actor.personId !== personId) {
    assertCanEditOwnProfile(ctx, personId);
  }
  const db = getDb();
  const existing = await repo.getPersonInChurch(db, ctx, personId);
  if (!existing) throw notFound();

  const patch: {
    preferredLocale?: string;
    directoryOptIn?: boolean;
    photoMediaId?: string | null;
  } = {};
  if (body.preferredLocale !== undefined) patch.preferredLocale = body.preferredLocale;
  if (body.directoryOptIn !== undefined) patch.directoryOptIn = body.directoryOptIn;
  if (body.photoMediaId !== undefined) patch.photoMediaId = body.photoMediaId;
  if (Object.keys(patch).length > 0) {
    await repo.updatePersonRow(db, ctx, personId, patch);
  }
  if (body.phoneE164 !== undefined) {
    await repo.upsertPrimaryContact(db, ctx, personId, 'phone', body.phoneE164);
  }
  if (body.email !== undefined) {
    await repo.upsertPrimaryContact(db, ctx, personId, 'email', body.email);
  }

  await writeAudit(db, ctx, {
    action: 'people.person.self_updated',
    entityType: 'person',
    entityId: personId,
    metadata: {
      fields: Object.keys(body),
    },
  });

  const row = await repo.getPersonInChurch(db, ctx, personId);
  if (!row) throw notFound();
  const contacts = await repo.listContactsForPerson(db, personId);
  return toPersonResponse(row, contacts, { includeRestricted: true });
}

export async function addPersonContact(
  ctx: Ctx,
  personId: string,
  body: CreatePersonContactBody,
) {
  assertCanManageContacts(ctx, personId);
  const db = getDb();
  const existing = await repo.getPersonInChurch(db, ctx, personId);
  if (!existing) throw notFound();

  const contactId = await repo.insertOrReviveContact(db, ctx, personId, {
    channel: body.channel,
    value: body.value,
    isPrimary: body.isPrimary ?? false,
  });

  await writeAudit(db, ctx, {
    action: 'people.contact.added',
    entityType: 'person',
    entityId: personId,
    metadata: { contactId, channel: body.channel, isPrimary: body.isPrimary ?? false },
  });

  const row = await repo.getPersonInChurch(db, ctx, personId);
  if (!row) throw notFound();
  const contacts = await repo.listContactsForPerson(db, personId);
  return toPersonResponse(row, contacts, personDtoOptions(ctx, personId));
}

export async function listDirectory(ctx: Ctx, query: ListDirectoryQuery) {
  assertCanReadDirectory(ctx);
  const db = getDb();
  const rows = await repo.listDirectoryOptIns(db, ctx, {
    q: query.q,
    limit: query.limit,
    cursor: query.cursor,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const data = await Promise.all(
    page.map(async (row) => {
      const ministries = await repo.listActiveMinistriesForPerson(db, ctx, row.id);
      return {
        personId: row.id,
        displayName: row.displayName,
        photoMediaId: row.photoMediaId,
        ministries: ministries.map((m) => ({
          organisationalUnitId: m.organisationalUnitId,
          name: m.name,
          roleInUnit: m.roleInUnit,
        })),
      };
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
