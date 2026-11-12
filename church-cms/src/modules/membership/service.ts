import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { getPersonInChurch } from '@/modules/people/repository';
import { MEMBERSHIP_STATUS_TRANSITIONS, type MembershipStatus } from './constants';
import {
  toMembershipApplicationResponse,
  toMembershipResponse,
  toMembershipStatusHistoryResponse,
} from './mappers';
import {
  assertCanApproveMemberships,
  assertCanCreateMembershipApplication,
  assertCanCreateMemberships,
  assertCanReadMemberships,
  assertCanUpdateMembershipStatus,
} from './policies';
import * as repo from './repository';
import type {
  CreateMembershipApplicationBody,
  CreateMembershipBody,
  DecideMembershipApplicationBody,
  ListMembershipApplicationsQuery,
  ListMembershipsQuery,
  UpdateMembershipStatusBody,
} from './schemas';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

export async function listMemberships(ctx: Ctx, query: ListMembershipsQuery) {
  assertCanReadMemberships(ctx);
  const rows = await repo.listMembershipsForChurch(getDb(), ctx, {
    status: query.status,
    q: query.q,
    limit: query.limit,
    cursor: query.cursor,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    data: page.map(toMembershipResponse),
    meta: {
      limit: query.limit,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
    },
  };
}

export async function getMembership(ctx: Ctx, membershipId: string) {
  assertCanReadMemberships(ctx);
  const row = await repo.getMembershipById(getDb(), ctx, membershipId);
  if (!row) throw notFound();
  return toMembershipResponse(row);
}

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

export async function createMembership(ctx: Ctx, body: CreateMembershipBody) {
  assertCanCreateMemberships(ctx);
  const db = getDb();
  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();

  const existing = await repo.getMembershipForPerson(db, ctx, body.personId);
  if (existing) {
    throw conflict('Person already has a membership in this church.');
  }

  try {
    const id = await repo.insertMembership(db, ctx, body);
    await writeAudit(db, ctx, {
      action: 'membership.membership.created',
      entityType: 'membership',
      entityId: id,
      metadata: { personId: body.personId, status: body.status },
    });
    const row = await repo.getMembershipById(db, ctx, id);
    if (!row) throw notFound();
    return toMembershipResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Person already has a membership in this church.');
    }
    throw error;
  }
}

export async function listMembershipStatusHistory(ctx: Ctx, membershipId: string) {
  assertCanReadMemberships(ctx);
  const result = await repo.listMembershipStatusHistory(getDb(), ctx, membershipId);
  if (!result) throw notFound();
  return { data: result.rows.map(toMembershipStatusHistoryResponse) };
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

export async function createMembershipApplication(
  ctx: Ctx,
  body: CreateMembershipApplicationBody,
) {
  const personId = body.personId ?? ctx.actor.personId;
  if (!personId) {
    throw validationFailed([
      { field: 'personId', code: 'required', message: 'personId is required' },
    ]);
  }
  assertCanCreateMembershipApplication(ctx, personId);

  const db = getDb();
  const person = await getPersonInChurch(db, ctx, personId);
  if (!person) throw notFound();

  const existingMembership = await repo.getMembershipForPerson(db, ctx, personId);
  if (!existingMembership) {
    await repo.createVisitorMembership(db, ctx, personId, {
      householdId: body.householdId,
    });
  } else if (existingMembership.status === 'active') {
    throw conflict('Person already has an active membership.');
  }

  try {
    const id = await repo.insertMembershipApplication(db, ctx, {
      personId,
      householdId: body.householdId ?? existingMembership?.householdId ?? undefined,
    });
    await writeAudit(db, ctx, {
      action: 'membership.application.created',
      entityType: 'membership_application',
      entityId: id,
      metadata: { personId },
    });
    const row = await repo.getMembershipApplicationById(db, ctx, id);
    if (!row) throw notFound();
    return toMembershipApplicationResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A pending membership application already exists for this person.');
    }
    throw error;
  }
}

export async function listMembershipApplications(
  ctx: Ctx,
  query: ListMembershipApplicationsQuery,
) {
  assertCanReadMemberships(ctx);
  const rows = await repo.listMembershipApplications(
    getDb(),
    ctx,
    query.status,
    query.limit,
  );
  return { data: rows.map(toMembershipApplicationResponse) };
}

export async function decideMembershipApplication(
  ctx: Ctx,
  applicationId: string,
  body: DecideMembershipApplicationBody,
) {
  assertCanApproveMemberships(ctx);
  const db = getDb();
  const application = await repo.getMembershipApplicationById(db, ctx, applicationId);
  if (!application) throw notFound();
  if (application.status !== 'pending') {
    throw conflict('Membership application is not pending.');
  }

  await repo.insertMembershipDecision(
    db,
    ctx,
    applicationId,
    body.outcome,
    body.reason,
  );

  let membershipId: string | null = null;
  if (body.outcome === 'approved') {
    membershipId = await repo.activateMembershipForPerson(
      db,
      ctx,
      application.personId,
      application.householdId,
      body.reason,
    );
    await repo.setMembershipApplicationStatus(db, ctx, applicationId, 'approved');
  } else {
    const membership = await repo.getMembershipForPerson(
      db,
      ctx,
      application.personId,
    );
    if (membership && membership.status === 'visitor') {
      // Policy default: rejected applicants stay visitor (not forced inactive).
      membershipId = membership.id;
    }
    await repo.setMembershipApplicationStatus(db, ctx, applicationId, 'rejected');
  }

  await writeAudit(db, ctx, {
    action: `membership.application.${body.outcome}`,
    entityType: 'membership_application',
    entityId: applicationId,
    metadata: {
      personId: application.personId,
      membershipId,
      reason: body.reason ?? null,
    },
  });

  const updated = await repo.getMembershipApplicationById(db, ctx, applicationId);
  if (!updated) throw notFound();
  return {
    application: toMembershipApplicationResponse(updated),
    membershipId,
  };
}
