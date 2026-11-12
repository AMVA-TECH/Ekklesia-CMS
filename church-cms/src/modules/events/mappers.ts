import type {
  attendanceSessions,
  attendanceSummaries,
  eventRegistrations,
  eventTypes,
  events,
} from './db-schema';
import type {
  AttendanceSessionResponse,
  EventRegistrationResponse,
  EventResponse,
  EventTypeResponse,
} from './schemas';
import type { RegistrationStatus } from './constants';

type EventTypeRow = typeof eventTypes.$inferSelect;
type EventRow = typeof events.$inferSelect;
type RegistrationRow = typeof eventRegistrations.$inferSelect;
type SessionRow = typeof attendanceSessions.$inferSelect;
type SummaryRow = typeof attendanceSummaries.$inferSelect;

export function toEventTypeResponse(row: EventTypeRow): EventTypeResponse {
  return { id: row.id, code: row.code, name: row.name };
}

export function toEventResponse(
  row: EventRow,
  extras?: { eventTypeCode?: string | null; eventTypeName?: string | null },
): EventResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    serviceDate: row.serviceDate,
    eventTypeId: row.eventTypeId,
    eventTypeCode: extras?.eventTypeCode ?? null,
    eventTypeName: extras?.eventTypeName ?? null,
    organisationalUnitId: row.organisationalUnitId,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    status: row.status,
    posterMediaId: row.posterMediaId ?? null,
    posterUrl: row.posterMediaId
      ? `/api/v1/media/${row.posterMediaId}/content`
      : null,
  };
}

export function toEventRegistrationResponse(
  row: RegistrationRow,
): EventRegistrationResponse {
  return {
    id: row.id,
    eventId: row.eventId,
    personId: row.personId,
    status: row.status as RegistrationStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAttendanceSessionResponse(
  row: SessionRow,
  extras?: { summary?: SummaryRow | null; recordCount?: number },
): AttendanceSessionResponse {
  return {
    id: row.id,
    eventId: row.eventId,
    mode: row.mode,
    status: row.status,
    recordedAt: row.recordedAt.toISOString(),
    finalizedAt: row.finalizedAt ? row.finalizedAt.toISOString() : null,
    summary: extras?.summary
      ? {
          menCount: extras.summary.menCount,
          womenCount: extras.summary.womenCount,
          childrenCount: extras.summary.childrenCount,
          visitorsCount: extras.summary.visitorsCount,
          totalCount: extras.summary.totalCount,
        }
      : extras?.summary === null
        ? null
        : undefined,
    recordCount: extras?.recordCount,
  };
}
