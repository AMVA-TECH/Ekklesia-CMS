import type {
  appointments,
  organisationalUnits,
  positions,
  programmes,
} from './db-schema';
import type {
  AppointmentResponse,
  PositionResponse,
  ProgrammeResponse,
  UnitResponse,
} from './schemas';

type UnitRow = typeof organisationalUnits.$inferSelect;
type ProgrammeRow = typeof programmes.$inferSelect;
type PositionRow = typeof positions.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;

export function toUnitResponse(row: UnitRow): UnitResponse {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    name: row.name,
    description: row.description ?? null,
    parentId: row.parentId,
    status: row.status,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export function toProgrammeResponse(row: ProgrammeRow): ProgrammeResponse {
  return {
    id: row.id,
    ministryUnitId: row.ministryUnitId,
    name: row.name,
    status: row.status,
  };
}

export function toPositionResponse(row: PositionRow): PositionResponse {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description ?? null,
    organisationalUnitId: row.organisationalUnitId,
    reportsToPositionId: row.reportsToPositionId,
    status: row.status,
    occupancyPolicy: row.occupancyPolicy,
  };
}

export function toAppointmentResponse(row: AppointmentRow): AppointmentResponse {
  return {
    id: row.id,
    positionId: row.positionId,
    personId: row.personId,
    organisationalUnitId: row.organisationalUnitId,
    appointmentKind: row.appointmentKind,
    notes: row.notes ?? null,
    appointedByUserId: row.appointedByUserId,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    status: row.status,
  };
}
