import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import {
  findPersonIdForUser,
  getPersonInChurch,
} from '@/modules/people/repository';
import { getUnitById } from '@/modules/organisation/repository';
import { PARTICIPATION_STATUS_TRANSITIONS } from './constants';
import { toParticipationRequestResponse, toParticipationResponse } from './mappers';
import {
  assertCanApproveParticipations,
  assertCanReadParticipations,
  assertCanRequestParticipation,
} from './policies';
import type {
  AddParticipationBody,
  CreateParticipationRequestBody,
  DecideParticipationRequestBody,
  EndParticipationBody,
  ListMyParticipationRequestsQuery,
} from './schemas';
import * as repo from './repository';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listParticipations(ctx: Ctx, organisationalUnitId: string) {
  assertCanReadParticipations(ctx, organisationalUnitId);
  const db = getDb();
  const unit = await getUnitById(db, ctx, organisationalUnitId);
  if (!unit) throw notFound();
  const rows = await repo.listParticipationsForUnit(db, ctx, organisationalUnitId);
  return { data: rows.map(toParticipationResponse) };
}

export async function addParticipation(
  ctx: Ctx,
  organisationalUnitId: string,
  body: AddParticipationBody,
) {
  assertCanApproveParticipations(ctx, organisationalUnitId);
  const db = getDb();
  const unit = await getUnitById(db, ctx, organisationalUnitId);
  if (!unit) throw notFound();
  if (unit.kind !== 'ministry' && unit.kind !== 'life_group') {
    throw validationFailed([
      {
        field: 'organisationalUnitId',
        message: 'Participations are only for ministry or life_group units',
        code: 'invalid_kind',
      },
    ]);
  }

  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();

  try {
    const id = await repo.insertParticipation(db, ctx, {
      organisationalUnitId,
      personId: body.personId,
      roleInUnit: body.roleInUnit,
      effectiveFrom: body.effectiveFrom ?? todayIsoDate(),
    });
    await writeAudit(db, ctx, {
      action: 'ministries.participation.created',
      entityType: 'participation',
      entityId: id,
    });
    const row = await repo.getParticipationById(db, ctx, id);
    if (!row) throw notFound();
    return toParticipationResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Person already has an active participation in this unit.');
    }
    throw error;
  }
}

export async function endParticipation(
  ctx: Ctx,
  participationId: string,
  body: EndParticipationBody,
) {
  const db = getDb();
  const existing = await repo.getParticipationById(db, ctx, participationId);
  if (!existing) throw notFound();
  assertCanApproveParticipations(ctx, existing.organisationalUnitId);

  const allowed =
    PARTICIPATION_STATUS_TRANSITIONS[
      existing.status as keyof typeof PARTICIPATION_STATUS_TRANSITIONS
    ] ?? [];
  if (!allowed.includes('ended')) {
    throw conflict(`Cannot end participation from status ${existing.status}.`);
  }

  await repo.endParticipation(
    db,
    ctx,
    participationId,
    body.effectiveTo ?? todayIsoDate(),
  );
  await writeAudit(db, ctx, {
    action: 'ministries.participation.ended',
    entityType: 'participation',
    entityId: participationId,
  });
  const row = await repo.getParticipationById(db, ctx, participationId);
  if (!row) throw notFound();
  return toParticipationResponse(row);
}

export async function listMyParticipationRequests(
  ctx: Ctx,
  query: ListMyParticipationRequestsQuery,
) {
  assertCanRequestParticipation(ctx);
  const db = getDb();
  const personId = (await findPersonIdForUser(db, ctx)) ?? ctx.actor.personId;
  if (!personId) {
    throw validationFailed([
      {
        field: 'personId',
        message: 'No person linked to this account for the active church',
        code: 'required',
      },
    ]);
  }
  const rows = await repo.listParticipationRequestsForPerson(db, ctx, personId, {
    status: query.status,
    limit: query.limit,
  });
  return { data: rows.map(toParticipationRequestResponse) };
}

export async function createParticipationRequest(
  ctx: Ctx,
  body: CreateParticipationRequestBody,
) {
  assertCanRequestParticipation(ctx);
  const db = getDb();
  const unit = await getUnitById(db, ctx, body.organisationalUnitId);
  if (!unit) throw notFound();

  const personId = body.personId ?? ctx.actor.personId;
  if (!personId) {
    throw validationFailed([
      { field: 'personId', message: 'personId is required', code: 'required' },
    ]);
  }
  const person = await getPersonInChurch(db, ctx, personId);
  if (!person) throw notFound();

  try {
    const id = await repo.insertParticipationRequest(
      db,
      ctx,
      body.organisationalUnitId,
      personId,
    );
    await writeAudit(db, ctx, {
      action: 'ministries.participation_request.created',
      entityType: 'participation_request',
      entityId: id,
    });
    const row = await repo.getParticipationRequestById(db, ctx, id);
    if (!row) throw notFound();
    return toParticipationRequestResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A pending participation request already exists for this person.');
    }
    throw error;
  }
}

export async function decideParticipationRequest(
  ctx: Ctx,
  requestId: string,
  body: DecideParticipationRequestBody,
) {
  const db = getDb();
  const request = await repo.getParticipationRequestById(db, ctx, requestId);
  if (!request) throw notFound();
  assertCanApproveParticipations(ctx, request.organisationalUnitId);

  if (request.status !== 'pending') {
    throw conflict('Participation request is not pending.');
  }

  await repo.decideParticipationRequest(db, ctx, requestId, body.decision);

  if (body.decision === 'approved') {
    try {
      await repo.insertParticipation(db, ctx, {
        organisationalUnitId: request.organisationalUnitId,
        personId: request.personId,
        roleInUnit: body.roleInUnit,
        effectiveFrom: todayIsoDate(),
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  await writeAudit(db, ctx, {
    action: `ministries.participation_request.${body.decision}`,
    entityType: 'participation_request',
    entityId: requestId,
  });

  const row = await repo.getParticipationRequestById(db, ctx, requestId);
  if (!row) throw notFound();
  return toParticipationRequestResponse(row);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
