import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { getPersonInChurch } from '@/modules/people/repository';
import {
  listActiveAssignmentsForUnit,
  listAssignmentsRelatedToAppointment,
} from '@/modules/access-control/repository';
import { organisationUsers } from '@/modules/people/db-schema';
import { and, eq, isNull } from 'drizzle-orm';
import { wouldCreateCycle } from './hierarchy';
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
  UpdatePositionBody,
  UpdateProgrammeBody,
  UpdateUnitBody,
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

export async function updateOrganisationalUnit(
  ctx: Ctx,
  unitId: string,
  body: UpdateUnitBody,
) {
  assertCanWriteUnits(ctx, unitId);
  const db = getDb();
  const existing = await repo.getUnitById(db, ctx, unitId);
  if (!existing) throw notFound();

  if (body.parentId !== undefined && body.parentId !== null) {
    const parent = await repo.getUnitById(db, ctx, body.parentId);
    if (!parent) throw notFound();

    const edges = await repo.listAllUnitParentEdges(db, ctx);
    const parentById = new Map(edges.map((e) => [e.id, e.parentId]));
    if (wouldCreateCycle(unitId, body.parentId, parentById)) {
      throw validationFailed([
        {
          field: 'parentId',
          code: 'circular_hierarchy',
          message: 'Parent assignment would create a circular hierarchy',
        },
      ]);
    }
  }

  const structuralRisk =
    (body.status !== undefined && body.status !== existing.status) ||
    (body.parentId !== undefined && body.parentId !== existing.parentId);

  if (structuralRisk) {
    const assignments = await listActiveAssignmentsForUnit(db, ctx, unitId);
    if (assignments.length > 0 && body.confirmStructuralChange !== true) {
      throw validationFailed([
        {
          field: 'confirmStructuralChange',
          code: 'confirmation_required',
          message: `${assignments.length} active unit-scoped role assignment(s) would be affected. Pass confirmStructuralChange:true after review.`,
        },
      ]);
    }
  }

  const { confirmStructuralChange: _confirm, ...unitPatch } = body;

  try {
    await repo.updateUnit(db, ctx, unitId, unitPatch);
    await writeAudit(db, ctx, {
      action: 'organisation.unit.updated',
      entityType: 'organisational_unit',
      entityId: unitId,
      metadata: { fields: Object.keys(body) },
    });
    const row = await repo.getUnitById(db, ctx, unitId);
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

export async function getPosition(ctx: Ctx, positionId: string) {
  assertCanReadPositions(ctx);
  const row = await repo.getPositionById(getDb(), ctx, positionId);
  if (!row) throw notFound();
  return toPositionResponse(row);
}

export async function createPosition(ctx: Ctx, body: CreatePositionBody) {
  assertCanWritePositions(ctx);
  const db = getDb();

  if (body.organisationalUnitId) {
    const unit = await repo.getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }
  if (body.reportsToPositionId) {
    const reportsTo = await repo.getPositionById(db, ctx, body.reportsToPositionId);
    if (!reportsTo) throw notFound();
  }

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

export async function updatePosition(
  ctx: Ctx,
  positionId: string,
  body: UpdatePositionBody,
) {
  assertCanWritePositions(ctx);
  const db = getDb();
  const existing = await repo.getPositionById(db, ctx, positionId);
  if (!existing) throw notFound();

  if (body.organisationalUnitId) {
    const unit = await repo.getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }

  if (body.reportsToPositionId !== undefined && body.reportsToPositionId !== null) {
    const reportsTo = await repo.getPositionById(db, ctx, body.reportsToPositionId);
    if (!reportsTo) throw notFound();

    const edges = await repo.listAllPositionReportEdges(db, ctx);
    const parentById = new Map(
      edges.map((e) => [e.id, e.reportsToPositionId]),
    );
    if (wouldCreateCycle(positionId, body.reportsToPositionId, parentById)) {
      throw validationFailed([
        {
          field: 'reportsToPositionId',
          code: 'circular_hierarchy',
          message: 'Reporting assignment would create a circular hierarchy',
        },
      ]);
    }
  }

  await repo.updatePosition(db, ctx, positionId, body);
  await writeAudit(db, ctx, {
    action: 'organisation.position.updated',
    entityType: 'position',
    entityId: positionId,
    metadata: { fields: Object.keys(body) },
  });
  const row = await repo.getPositionById(db, ctx, positionId);
  if (!row) throw notFound();
  return toPositionResponse(row);
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

  if (position.occupancyPolicy === 'single') {
    const active = await repo.countActiveAppointmentsForPosition(
      db,
      ctx,
      body.positionId,
    );
    if (active > 0) {
      throw conflict(
        'This position allows only one active occupant. End the current appointment first.',
      );
    }
  }

  // Appointments never grant RBAC — role assignment remains a separate explicit step.
  const appointmentBody = {
    ...body,
    organisationalUnitId:
      body.organisationalUnitId ?? position.organisationalUnitId ?? undefined,
  };
  const id = await repo.insertAppointment(db, ctx, appointmentBody);
  await writeAudit(db, ctx, {
    action: 'organisation.appointment.created',
    entityType: 'appointment',
    entityId: id,
    metadata: {
      positionId: body.positionId,
      personId: body.personId,
      grantsPermissions: false,
    },
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

  // Never auto-revoke roles — surface related assignments for explicit review.
  let userAccountId: string | null = null;
  const [orgUser] = await db
    .select({ userAccountId: organisationUsers.userAccountId })
    .from(organisationUsers)
    .where(
      and(
        eq(organisationUsers.churchId, ctx.churchId),
        eq(organisationUsers.personId, existing.personId),
        eq(organisationUsers.status, 'active'),
        isNull(organisationUsers.deletedAt),
      ),
    )
    .limit(1);
  userAccountId = orgUser?.userAccountId ?? null;

  const relatedAssignments = await listAssignmentsRelatedToAppointment(
    db,
    ctx,
    {
      appointmentId,
      userAccountId,
      organisationalUnitId: existing.organisationalUnitId,
    },
  );

  return {
    ...toAppointmentResponse(row),
    accessReview: {
      autoRevoked: false,
      message:
        'Appointment ended. Review related role assignments — revoke, retain, or reassign explicitly.',
      userAccountId,
      relatedAssignments: relatedAssignments.map((a) => ({
        id: a.assignmentId,
        userAccountId: a.userAccountId,
        roleCode: a.roleCode,
        roleName: a.roleName,
        scopeType: a.scopeType,
        organisationalUnitId: a.organisationalUnitId,
        sourceAppointmentId: a.sourceAppointmentId ?? null,
      })),
      reviewPath: userAccountId
        ? `/admin/roles?tab=review&userAccountId=${userAccountId}`
        : '/admin/roles?tab=review',
    },
  };
}

export async function listAppointmentHistory(
  ctx: Ctx,
  appointmentId: string,
) {
  assertCanReadAppointments(ctx);
  const db = getDb();
  const existing = await repo.getAppointmentById(db, ctx, appointmentId);
  if (!existing) throw notFound();
  const rows = await repo.listAppointmentHistory(db, appointmentId);
  return {
    data: rows.map((r) => ({
      id: r.id,
      changeType: r.changeType,
      changedByUserId: r.changedByUserId,
      changedAt: r.changedAt.toISOString(),
      reason: r.reason,
    })),
  };
}

export async function updateProgramme(
  ctx: Ctx,
  programmeId: string,
  body: UpdateProgrammeBody,
) {
  assertCanWriteProgrammes(ctx);
  const db = getDb();
  const existing = await repo.getProgrammeById(db, ctx, programmeId);
  if (!existing) throw notFound();
  assertCanWriteUnits(ctx, existing.ministryUnitId);
  await repo.updateProgramme(db, ctx, programmeId, body);
  await writeAudit(db, ctx, {
    action: 'organisation.programme.updated',
    entityType: 'programme',
    entityId: programmeId,
    metadata: { fields: Object.keys(body) },
  });
  const row = await repo.getProgrammeById(db, ctx, programmeId);
  if (!row) throw notFound();
  return toProgrammeResponse(row);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
