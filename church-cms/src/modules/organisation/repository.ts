import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  appointmentHistory,
  appointments,
  organisationalUnits,
  positions,
  programmes,
} from './db-schema';
import type {
  CreateAppointmentBody,
  CreatePositionBody,
  CreateProgrammeBody,
  CreateUnitBody,
  ListAppointmentsQuery,
  ListPositionsQuery,
  ListUnitsQuery,
} from './schemas';

export async function listUnits(db: Db, ctx: Ctx, query: ListUnitsQuery) {
  const conditions = [
    eq(organisationalUnits.churchId, ctx.churchId),
    isNull(organisationalUnits.deletedAt),
  ];
  if (query.kind) conditions.push(eq(organisationalUnits.kind, query.kind));
  if (query.status) conditions.push(eq(organisationalUnits.status, query.status));

  return db
    .select()
    .from(organisationalUnits)
    .where(and(...conditions))
    .orderBy(asc(organisationalUnits.name))
    .limit(query.limit);
}

export async function getUnitById(db: Db, ctx: Ctx, unitId: string) {
  const [row] = await db
    .select()
    .from(organisationalUnits)
    .where(
      and(
        eq(organisationalUnits.id, unitId),
        eq(organisationalUnits.churchId, ctx.churchId),
        isNull(organisationalUnits.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertUnit(db: Db, ctx: Ctx, body: CreateUnitBody) {
  const id = newId();
  await db.insert(organisationalUnits).values({
    id,
    churchId: ctx.churchId,
    parentId: body.parentId,
    kind: body.kind,
    name: body.name,
    status: body.status ?? 'active',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function insertProgramme(db: Db, ctx: Ctx, body: CreateProgrammeBody) {
  const id = newId();
  await db.insert(programmes).values({
    id,
    churchId: ctx.churchId,
    ministryUnitId: body.ministryUnitId,
    name: body.name,
    status: body.status ?? 'active',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getProgrammeById(db: Db, ctx: Ctx, programmeId: string) {
  const [row] = await db
    .select()
    .from(programmes)
    .where(
      and(
        eq(programmes.id, programmeId),
        eq(programmes.churchId, ctx.churchId),
        isNull(programmes.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listProgrammesForUnit(db: Db, ctx: Ctx, ministryUnitId: string) {
  return db
    .select()
    .from(programmes)
    .where(
      and(
        eq(programmes.churchId, ctx.churchId),
        eq(programmes.ministryUnitId, ministryUnitId),
        isNull(programmes.deletedAt),
      ),
    )
    .orderBy(asc(programmes.name));
}

export async function listPositions(db: Db, ctx: Ctx, query: ListPositionsQuery) {
  return db
    .select()
    .from(positions)
    .where(and(eq(positions.churchId, ctx.churchId), isNull(positions.deletedAt)))
    .orderBy(asc(positions.code))
    .limit(query.limit);
}

export async function getPositionById(db: Db, ctx: Ctx, positionId: string) {
  const [row] = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.id, positionId),
        eq(positions.churchId, ctx.churchId),
        isNull(positions.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertPosition(db: Db, ctx: Ctx, body: CreatePositionBody) {
  const id = newId();
  await db.insert(positions).values({
    id,
    churchId: ctx.churchId,
    code: body.code,
    title: body.title,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function listAppointments(db: Db, ctx: Ctx, query: ListAppointmentsQuery) {
  const conditions = [
    eq(appointments.churchId, ctx.churchId),
    isNull(appointments.deletedAt),
  ];
  if (query.status) conditions.push(eq(appointments.status, query.status));
  if (query.personId) conditions.push(eq(appointments.personId, query.personId));
  if (query.positionId) conditions.push(eq(appointments.positionId, query.positionId));

  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(asc(appointments.effectiveFrom))
    .limit(query.limit);
}

export async function getAppointmentById(db: Db, ctx: Ctx, appointmentId: string) {
  const [row] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.churchId, ctx.churchId),
        isNull(appointments.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertAppointment(
  db: Db,
  ctx: Ctx,
  body: CreateAppointmentBody,
) {
  const id = newId();
  await db.insert(appointments).values({
    id,
    churchId: ctx.churchId,
    positionId: body.positionId,
    personId: body.personId,
    organisationalUnitId: body.organisationalUnitId,
    effectiveFrom: body.effectiveFrom,
    effectiveTo: body.effectiveTo,
    status: 'active',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  await db.insert(appointmentHistory).values({
    id: newId(),
    appointmentId: id,
    changeType: 'appointed',
    changedByUserId: ctx.actor.userAccountId,
  });
  return id;
}

export async function endAppointment(
  db: Db,
  ctx: Ctx,
  appointmentId: string,
  effectiveTo: string,
  reason?: string,
) {
  await db
    .update(appointments)
    .set({
      status: 'ended',
      effectiveTo,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.churchId, ctx.churchId),
        isNull(appointments.deletedAt),
      ),
    );
  await db.insert(appointmentHistory).values({
    id: newId(),
    appointmentId,
    changeType: 'ended',
    changedByUserId: ctx.actor.userAccountId,
    reason,
  });
}
