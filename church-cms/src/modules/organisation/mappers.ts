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
    kind: row.kind,
    name: row.name,
    parentId: row.parentId,
    status: row.status,
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
  };
}

export function toAppointmentResponse(row: AppointmentRow): AppointmentResponse {
  return {
    id: row.id,
    positionId: row.positionId,
    personId: row.personId,
    organisationalUnitId: row.organisationalUnitId,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    status: row.status,
  };
}
