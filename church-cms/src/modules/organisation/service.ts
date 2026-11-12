import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { getPersonInChurch } from '@/modules/people/repository';
import {
  toAppointmentResponse,
  toPositionResponse,
  toProgrammeResponse,
  toUnitResponse,
} from './mappers';
import {
  assertCanReadAppointments,
  assertCanReadPositions,
  assertCanReadUnits,
  assertCanWriteAppointments,
  assertCanWritePositions,
  assertCanWriteProgrammes,
  assertCanWriteUnits,
} from './policies';
import type {
  CreateAppointmentBody,
  CreatePositionBody,
  CreateProgrammeBody,
  CreateUnitBody,
  EndAppointmentBody,
  ListAppointmentsQuery,
  ListPositionsQuery,
  ListUnitsQuery,
} from './schemas';
import * as repo from './repository';

export async function listOrganisationalUnits(ctx: Ctx, query: ListUnitsQuery) {
  assertCanReadUnits(ctx);
  const rows = await repo.listUnits(getDb(), ctx, query);
  return { data: rows.map(toUnitResponse) };
}

export async function getOrganisationalUnit(ctx: Ctx, unitId: string) {
  assertCanReadUnits(ctx, unitId);
  const row = await repo.getUnitById(getDb(), ctx, unitId);
  if (!row) throw notFound();
  return toUnitResponse(row);
}

export async function createOrganisationalUnit(ctx: Ctx, body: CreateUnitBody) {
  assertCanWriteUnits(ctx);
  const db = getDb();

  if (body.parentId) {
    const parent = await repo.getUnitById(db, ctx, body.parentId);
    if (!parent) throw notFound();
  }

  try {
    const id = await repo.insertUnit(db, ctx, body);
    await writeAudit(db, ctx, {
      action: 'organisation.unit.created',
      entityType: 'organisational_unit',
      entityId: id,
    });
    const row = await repo.getUnitById(db, ctx, id);
    if (!row) throw notFound();
    return toUnitResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('An organisational unit with this kind and name already exists.');
    }
    throw error;
  }
}

export async function createProgramme(ctx: Ctx, body: CreateProgrammeBody) {
  assertCanWriteProgrammes(ctx);
  const db = getDb();
  const unit = await repo.getUnitById(db, ctx, body.ministryUnitId);
  if (!unit) throw notFound();
  if (unit.kind !== 'ministry') {
    throw validationFailed([
      {
        field: 'ministryUnitId',
        message: 'Programmes must belong to a ministry unit',
        code: 'invalid_kind',
      },
    ]);
  }

  const id = await repo.insertProgramme(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'organisation.programme.created',
    entityType: 'programme',
    entityId: id,
  });
  const row = await repo.getProgrammeById(db, ctx, id);
  if (!row) throw notFound();
  return toProgrammeResponse(row);
}

export async function listProgrammes(ctx: Ctx, ministryUnitId: string) {
  assertCanReadUnits(ctx, ministryUnitId);
  const db = getDb();
  const unit = await repo.getUnitById(db, ctx, ministryUnitId);
  if (!unit) throw notFound();
  const rows = await repo.listProgrammesForUnit(db, ctx, ministryUnitId);
  return { data: rows.map(toProgrammeResponse) };
}

export async function listPositions(ctx: Ctx, query: ListPositionsQuery) {
  assertCanReadPositions(ctx);
  const rows = await repo.listPositions(getDb(), ctx, query);
  return { data: rows.map(toPositionResponse) };
}

export async function createPosition(ctx: Ctx, body: CreatePositionBody) {
  assertCanWritePositions(ctx);
  const db = getDb();
  try {
    const id = await repo.insertPosition(db, ctx, body);
    await writeAudit(db, ctx, {
      action: 'organisation.position.created',
      entityType: 'position',
      entityId: id,
    });
    const row = await repo.getPositionById(db, ctx, id);
    if (!row) throw notFound();
    return toPositionResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A position with this code already exists.');
    }
    throw error;
  }
}

export async function listAppointments(ctx: Ctx, query: ListAppointmentsQuery) {
  assertCanReadAppointments(ctx);
  const rows = await repo.listAppointments(getDb(), ctx, query);
  return { data: rows.map(toAppointmentResponse) };
}

export async function createAppointment(ctx: Ctx, body: CreateAppointmentBody) {
  assertCanWriteAppointments(ctx);
  const db = getDb();

  const position = await repo.getPositionById(db, ctx, body.positionId);
  if (!position) throw notFound();

  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();

  if (body.organisationalUnitId) {
    const unit = await repo.getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }

  if (body.effectiveTo && body.effectiveTo < body.effectiveFrom) {
    throw validationFailed([
      {
        field: 'effectiveTo',
        message: 'effectiveTo must be on or after effectiveFrom',
        code: 'invalid_range',
      },
    ]);
  }

  const id = await repo.insertAppointment(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'organisation.appointment.created',
    entityType: 'appointment',
    entityId: id,
    metadata: { positionId: body.positionId, personId: body.personId },
  });
  const row = await repo.getAppointmentById(db, ctx, id);
  if (!row) throw notFound();
  return toAppointmentResponse(row);
}

export async function endAppointment(
  ctx: Ctx,
  appointmentId: string,
  body: EndAppointmentBody,
) {
  assertCanWriteAppointments(ctx);
  const db = getDb();
  const existing = await repo.getAppointmentById(db, ctx, appointmentId);
  if (!existing) throw notFound();
  if (existing.status !== 'active') {
    throw conflict('Appointment is already ended.');
  }

  const effectiveTo =
    body.effectiveTo ?? new Date().toISOString().slice(0, 10);
  if (effectiveTo < existing.effectiveFrom) {
    throw validationFailed([
      {
        field: 'effectiveTo',
        message: 'effectiveTo must be on or after effectiveFrom',
        code: 'invalid_range',
      },
    ]);
  }

  await repo.endAppointment(db, ctx, appointmentId, effectiveTo, body.reason);
  await writeAudit(db, ctx, {
    action: 'organisation.appointment.ended',
    entityType: 'appointment',
    entityId: appointmentId,
    metadata: { reason: body.reason ?? null },
  });
  const row = await repo.getAppointmentById(db, ctx, appointmentId);
  if (!row) throw notFound();
  return toAppointmentResponse(row);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
