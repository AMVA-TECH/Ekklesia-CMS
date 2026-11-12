import type { participationRequests, participations } from './db-schema';
import type { ParticipationRequestResponse, ParticipationResponse } from './schemas';

type ParticipationRow = typeof participations.$inferSelect;
type RequestRow = typeof participationRequests.$inferSelect;

export function toParticipationResponse(row: ParticipationRow): ParticipationResponse {
  return {
    id: row.id,
    organisationalUnitId: row.organisationalUnitId,
    personId: row.personId,
    roleInUnit: row.roleInUnit,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    status: row.status,
  };
}

export function toParticipationRequestResponse(
  row: RequestRow,
): ParticipationRequestResponse {
  return {
    id: row.id,
    organisationalUnitId: row.organisationalUnitId,
    personId: row.personId,
    status: row.status,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}
