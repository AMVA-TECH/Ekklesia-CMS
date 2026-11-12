import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, forbidden, notFound, validationFailed } from '@/platform/errors';
import { can } from '@/modules/access-control/can';
import {
  findPersonIdForUser,
  getPersonInChurch,
} from '@/modules/people/repository';
import { getUnitById } from '@/modules/organisation/repository';
import {
  toAttendanceSessionResponse,
  toEventRegistrationResponse,
  toEventResponse,
  toEventTypeResponse,
} from './mappers';
import {
  assertCanCheckInSelf,
  assertCanIssueAbsenceNotice,
  assertCanListRegistrations,
  assertCanReadAttendance,
  assertCanReadEvents,
  assertCanReadFamilyAttendance,
  assertCanReadLeadershipAttendanceStats,
  assertCanReadOwnAttendance,
  assertCanRecordAttendance,
  assertCanRegisterForEvents,
  assertCanRequestCorrection,
  assertCanResolveCorrection,
  assertCanWriteEvents,
} from './policies';
import { getMediaAsset } from '@/modules/media/repository';
import {
  ATTENDANCE_BAND_THRESHOLDS,
  DEFAULT_ATTENDANCE_LOOKBACK_DAYS,
  DEFAULT_EVENT_TYPES,
} from './constants';
import {
  bandForRate,
  defaultAttendanceRange,
  familyStatusForDay,
  nudgeForBand,
} from './progress';
import type {
  CreateAbsenceNoticeBody,
  CreateCorrectionRequestBody,
  CreateEventBody,
  CreateEventRegistrationBody,
  CreateEventTypeBody,
  FamilyAttendanceQuery,
  IssueQrTokenBody,
  LeadershipAttendanceStatsQuery,
  ListAbsenceNoticesQuery,
  ListCorrectionRequestsQuery,
  ListEventsQuery,
  MyAttendanceQuery,
  OpenAttendanceSessionBody,
  QrCheckInBody,
  RecordAttendanceBody,
  ResolveCorrectionRequestBody,
  UpdateEventBody,
  UpsertAttendanceSummaryBody,
} from './schemas';
import * as repo from './repository';

async function ensureDefaultEventTypes(ctx: Ctx) {
  const db = getDb();
  for (const t of DEFAULT_EVENT_TYPES) {
    const existing = await repo.getEventTypeByCode(db, ctx, t.code);
    if (!existing) {
      try {
        await repo.insertEventType(db, ctx, { code: t.code, name: t.name });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
  }
}

async function eventResponseWithType(ctx: Ctx, eventId: string) {
  const db = getDb();
  const row = await repo.getEventById(db, ctx, eventId);
  if (!row) throw notFound();
  let eventTypeCode: string | null = null;
  let eventTypeName: string | null = null;
  if (row.eventTypeId) {
    const t = await repo.getEventTypeById(db, ctx, row.eventTypeId);
    eventTypeCode = t?.code ?? null;
    eventTypeName = t?.name ?? null;
  }
  return toEventResponse(row, { eventTypeCode, eventTypeName });
}

function toCorrectionResponse(row: {
  id: string;
  personId: string;
  sessionId: string;
  requestedPresence: string;
  status: string;
  note: string | null;
  resolutionNote: string | null;
  resolvedByUserId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    personId: row.personId,
    sessionId: row.sessionId,
    requestedPresence: row.requestedPresence,
    status: row.status,
    note: row.note,
    resolutionNote: row.resolutionNote,
    resolvedByUserId: row.resolvedByUserId,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listEventTypes(ctx: Ctx) {
  assertCanReadEvents(ctx);
  await ensureDefaultEventTypes(ctx);
  const rows = await repo.listEventTypes(getDb(), ctx);
  return { data: rows.map(toEventTypeResponse) };
}

export async function createEventType(ctx: Ctx, body: CreateEventTypeBody) {
  assertCanWriteEvents(ctx);
  const db = getDb();
  try {
    const id = await repo.insertEventType(db, ctx, body);
    await writeAudit(db, ctx, {
      action: 'events.event_type.created',
      entityType: 'event_type',
      entityId: id,
    });
    const row = await repo.getEventTypeById(db, ctx, id);
    if (!row) throw notFound();
    return toEventTypeResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('An event type with this code already exists.');
    }
    throw error;
  }
}

export async function listEvents(ctx: Ctx, query: ListEventsQuery) {
  assertCanReadEvents(ctx);
  await ensureDefaultEventTypes(ctx);
  const db = getDb();
  const rows = await repo.listEvents(db, ctx, query);
  const types = await repo.listEventTypes(db, ctx);
  const byId = new Map(types.map((t) => [t.id, t]));
  return {
    data: rows.map((row) => {
      const t = row.eventTypeId ? byId.get(row.eventTypeId) : undefined;
      return toEventResponse(row, {
        eventTypeCode: t?.code ?? null,
        eventTypeName: t?.name ?? null,
      });
    }),
  };
}

export async function getEvent(ctx: Ctx, eventId: string) {
  assertCanReadEvents(ctx);
  return eventResponseWithType(ctx, eventId);
}

export async function createEvent(ctx: Ctx, body: CreateEventBody) {
  assertCanWriteEvents(ctx);
  const db = getDb();
  await ensureDefaultEventTypes(ctx);

  let eventTypeId = body.eventTypeId;
  if (body.eventTypeCode) {
    const eventType = await repo.getEventTypeByCode(db, ctx, body.eventTypeCode);
    if (!eventType) throw notFound();
    eventTypeId = eventType.id;
  } else if (body.eventTypeId) {
    const eventType = await repo.getEventTypeById(db, ctx, body.eventTypeId);
    if (!eventType) throw notFound();
  }
  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }
  if (body.posterMediaId) {
    const media = await getMediaAsset(db, ctx, body.posterMediaId);
    if (!media) throw notFound();
  }

  const id = await repo.insertEvent(db, ctx, { ...body, eventTypeId });
  await writeAudit(db, ctx, {
    action: 'events.event.created',
    entityType: 'event',
    entityId: id,
    metadata: {
      eventTypeId: eventTypeId ?? null,
      posterMediaId: body.posterMediaId ?? null,
    },
  });
  return eventResponseWithType(ctx, id);
}

export async function updateEvent(ctx: Ctx, eventId: string, body: UpdateEventBody) {
  assertCanWriteEvents(ctx);
  const db = getDb();
  const existing = await repo.getEventById(db, ctx, eventId);
  if (!existing) throw notFound();

  if (body.eventTypeId) {
    const eventType = await repo.getEventTypeById(db, ctx, body.eventTypeId);
    if (!eventType) throw notFound();
  }
  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }
  if (body.posterMediaId) {
    const media = await getMediaAsset(db, ctx, body.posterMediaId);
    if (!media) throw notFound();
  }

  await repo.updateEvent(db, ctx, eventId, {
    title: body.title,
    description: body.description,
    serviceDate: body.serviceDate,
    eventTypeId: body.eventTypeId,
    organisationalUnitId: body.organisationalUnitId,
    startsAt:
      body.startsAt === undefined
        ? undefined
        : body.startsAt === null
          ? null
          : new Date(body.startsAt),
    endsAt:
      body.endsAt === undefined
        ? undefined
        : body.endsAt === null
          ? null
          : new Date(body.endsAt),
    status: body.status,
    posterMediaId: body.posterMediaId,
  });
  await writeAudit(db, ctx, {
    action: 'events.event.updated',
    entityType: 'event',
    entityId: eventId,
    metadata: {
      posterMediaId: body.posterMediaId ?? undefined,
    },
  });
  return eventResponseWithType(ctx, eventId);
}

export async function listEventRegistrations(ctx: Ctx, eventId: string) {
  assertCanListRegistrations(ctx);
  const db = getDb();
  const event = await repo.getEventById(db, ctx, eventId);
  if (!event) throw notFound();
  const rows = await repo.listRegistrationsForEvent(db, eventId);
  return { data: rows.map(toEventRegistrationResponse) };
}

export async function registerForEvent(
  ctx: Ctx,
  eventId: string,
  body: CreateEventRegistrationBody,
) {
  assertCanRegisterForEvents(ctx);
  const db = getDb();
  const event = await repo.getEventById(db, ctx, eventId);
  if (!event) throw notFound();
  if (event.status === 'cancelled') {
    throw conflict('Cannot register for a cancelled event.');
  }

  const personId = body.personId ?? ctx.actor.personId;
  if (!personId) {
    throw validationFailed([
      { field: 'personId', code: 'required', message: 'personId is required' },
    ]);
  }
  if (
    body.personId &&
    body.personId !== ctx.actor.personId &&
    !can(ctx, 'events:write')
  ) {
    throw forbidden('Only staff can register another person.');
  }

  const person = await getPersonInChurch(db, ctx, personId);
  if (!person) throw notFound();

  const existing = await repo.getRegistrationForPerson(db, eventId, personId);
  if (existing?.status === 'registered') {
    return toEventRegistrationResponse(existing);
  }
  if (existing) {
    await repo.setRegistrationStatus(db, ctx, existing.id, 'registered');
    await writeAudit(db, ctx, {
      action: 'events.registration.reactivated',
      entityType: 'event_registration',
      entityId: existing.id,
      metadata: { eventId, personId },
    });
    const updated = await repo.getRegistrationForPerson(db, eventId, personId);
    if (!updated) throw notFound();
    return toEventRegistrationResponse(updated);
  }

  try {
    const id = await repo.insertRegistration(db, ctx, eventId, personId);
    await writeAudit(db, ctx, {
      action: 'events.registration.created',
      entityType: 'event_registration',
      entityId: id,
      metadata: { eventId, personId },
    });
    const row = await repo.getRegistrationForPerson(db, eventId, personId);
    if (!row) throw notFound();
    return toEventRegistrationResponse(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const row = await repo.getRegistrationForPerson(db, eventId, personId);
      if (row) return toEventRegistrationResponse(row);
      throw conflict('Already registered for this event.');
    }
    throw error;
  }
}

export async function cancelMyEventRegistration(ctx: Ctx, eventId: string) {
  assertCanRegisterForEvents(ctx);
  const personId = ctx.actor.personId;
  if (!personId) {
    throw validationFailed([
      { field: 'personId', code: 'required', message: 'Session personId is required' },
    ]);
  }
  const db = getDb();
  const event = await repo.getEventById(db, ctx, eventId);
  if (!event) throw notFound();
  const existing = await repo.getRegistrationForPerson(db, eventId, personId);
  if (!existing || existing.status !== 'registered') {
    throw notFound();
  }
  await repo.setRegistrationStatus(db, ctx, existing.id, 'cancelled');
  await writeAudit(db, ctx, {
    action: 'events.registration.cancelled',
    entityType: 'event_registration',
    entityId: existing.id,
    metadata: { eventId, personId },
  });
  const updated = await repo.getRegistrationForPerson(db, eventId, personId);
  if (!updated) throw notFound();
  return toEventRegistrationResponse(updated);
}

export async function openAttendanceSession(
  ctx: Ctx,
  eventId: string,
  body: OpenAttendanceSessionBody,
) {
  assertCanRecordAttendance(ctx);
  const db = getDb();
  const event = await repo.getEventById(db, ctx, eventId);
  if (!event) throw notFound();

  const id = await repo.insertAttendanceSession(db, ctx, eventId, body.mode);
  await writeAudit(db, ctx, {
    action: 'events.attendance_session.opened',
    entityType: 'attendance_session',
    entityId: id,
  });
  return loadSessionResponse(db, ctx, id);
}

export async function getAttendanceSession(ctx: Ctx, sessionId: string) {
  assertCanReadAttendance(ctx);
  return loadSessionResponse(getDb(), ctx, sessionId);
}

export async function recordAttendance(
  ctx: Ctx,
  sessionId: string,
  body: RecordAttendanceBody,
) {
  assertCanRecordAttendance(ctx);
  const db = getDb();
  const session = await repo.getAttendanceSessionById(db, ctx, sessionId);
  if (!session) throw notFound();
  if (session.status !== 'open') {
    throw conflict('Attendance session is finalized.');
  }
  if (session.mode === 'headcount') {
    throw conflict('Roll-call records are not used for headcount sessions.');
  }

  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();

  try {
    await repo.insertAttendanceRecord(db, ctx, sessionId, body);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Attendance already recorded for this person in the session.');
    }
    throw error;
  }

  await writeAudit(db, ctx, {
    action: 'events.attendance_record.created',
    entityType: 'attendance_session',
    entityId: sessionId,
    metadata: { personId: body.personId },
  });
  return loadSessionResponse(db, ctx, sessionId);
}

export async function upsertAttendanceSummary(
  ctx: Ctx,
  sessionId: string,
  body: UpsertAttendanceSummaryBody,
) {
  assertCanRecordAttendance(ctx);
  const db = getDb();
  const session = await repo.getAttendanceSessionById(db, ctx, sessionId);
  if (!session) throw notFound();
  if (session.status !== 'open') {
    throw conflict('Attendance session is finalized.');
  }
  if (session.mode !== 'headcount' && session.mode !== 'qr_mixed') {
    throw conflict('Headcount summary is only for headcount or qr_mixed sessions.');
  }

  await repo.upsertAttendanceSummary(db, ctx, sessionId, body);
  await writeAudit(db, ctx, {
    action: 'events.attendance_summary.upserted',
    entityType: 'attendance_session',
    entityId: sessionId,
  });
  return loadSessionResponse(db, ctx, sessionId);
}

export async function finalizeAttendanceSession(ctx: Ctx, sessionId: string) {
  assertCanRecordAttendance(ctx);
  const db = getDb();
  const session = await repo.getAttendanceSessionById(db, ctx, sessionId);
  if (!session) throw notFound();
  if (session.status !== 'open') {
    throw conflict('Attendance session is already finalized.');
  }

  if (session.mode === 'headcount') {
    const summary = await repo.getAttendanceSummary(db, sessionId);
    if (!summary) {
      throw conflict('Headcount summary is required before finalizing.');
    }
  }

  await repo.finalizeAttendanceSession(db, ctx, sessionId);
  await repo.upsertDayAggregateForSession(db, ctx, sessionId);
  await writeAudit(db, ctx, {
    action: 'events.attendance_session.finalized',
    entityType: 'attendance_session',
    entityId: sessionId,
  });
  return loadSessionResponse(db, ctx, sessionId);
}

export async function listAttendanceSessions(ctx: Ctx, eventId: string) {
  assertCanReadAttendance(ctx);
  const db = getDb();
  const event = await repo.getEventById(db, ctx, eventId);
  if (!event) throw notFound();
  const rows = await repo.listAttendanceSessionsForEvent(db, ctx, eventId);
  const data = await Promise.all(
    rows.map(async (row) => {
      const summary = await repo.getAttendanceSummary(db, row.id);
      const recordCount = await repo.countAttendanceRecords(db, row.id);
      return toAttendanceSessionResponse(row, { summary, recordCount });
    }),
  );
  return { data };
}

export async function listSessionRecords(ctx: Ctx, sessionId: string) {
  assertCanReadAttendance(ctx);
  const db = getDb();
  const session = await repo.getAttendanceSessionById(db, ctx, sessionId);
  if (!session) throw notFound();
  const rows = await repo.listAttendanceRecords(db, sessionId);
  return {
    data: rows.map((r) => ({
      id: r.id,
      personId: r.personId,
      presence: r.presence,
      source: r.source,
      checkedInAt: r.checkedInAt.toISOString(),
      checkInName: r.checkInName,
      checkInPhone: r.checkInPhone,
    })),
  };
}

export async function issueSessionQrToken(
  ctx: Ctx,
  sessionId: string,
  body: IssueQrTokenBody,
) {
  assertCanRecordAttendance(ctx);
  const db = getDb();
  const session = await repo.getAttendanceSessionById(db, ctx, sessionId);
  if (!session) throw notFound();
  if (session.status !== 'open') throw conflict('Session must be open to issue QR.');
  if (session.mode !== 'qr_mixed' && session.mode !== 'roll_call') {
    throw conflict('QR tokens require qr_mixed or roll_call mode.');
  }
  const expiresAt = new Date(Date.now() + body.expiresInMinutes * 60_000);
  const issued = await repo.insertQrToken(db, ctx, sessionId, expiresAt);
  await writeAudit(db, ctx, {
    action: 'events.attendance_qr.issued',
    entityType: 'attendance_session',
    entityId: sessionId,
    metadata: { expiresAt: expiresAt.toISOString() },
  });
  return {
    sessionId,
    token: issued.token,
    expiresAt: issued.expiresAt.toISOString(),
  };
}

export async function checkInWithQr(ctx: Ctx, body: QrCheckInBody) {
  assertCanCheckInSelf(ctx);
  return performQrCheckIn(ctx, body);
}

/** Public QR check-in — church inferred from token; no permission check. */
export async function checkInWithQrPublic(ctx: Ctx, body: QrCheckInBody) {
  return performQrCheckIn(ctx, body);
}

async function performQrCheckIn(ctx: Ctx, body: QrCheckInBody) {
  const db = getDb();
  const tokenRow = await repo.findValidQrToken(db, body.token);
  if (!tokenRow || tokenRow.revokedAt) throw notFound();
  if (tokenRow.churchId !== ctx.churchId) throw notFound();
  if (tokenRow.expiresAt.getTime() < Date.now()) {
    throw conflict('QR token has expired.');
  }
  if (tokenRow.status !== 'open') throw conflict('Attendance session is finalized.');

  let personId = body.personId;
  if (personId) {
    const person = await getPersonInChurch(db, ctx, personId);
    if (!person) throw notFound();
  } else if (body.phone) {
    personId = (await repo.findPersonIdByPhone(db, body.phone)) ?? undefined;
  }
  if (!personId) {
    const name = body.name ?? body.phone ?? 'QR Guest';
    personId = await repo.insertGuestPerson(db, ctx, name, body.phone);
  }

  const recordId = await repo.upsertQrAttendanceRecord(
    db,
    ctx,
    tokenRow.sessionId,
    personId,
    body.name,
    body.phone,
  );
  await writeAudit(db, ctx, {
    action: 'events.attendance_record.qr_check_in',
    entityType: 'attendance_session',
    entityId: tokenRow.sessionId,
    metadata: { personId, recordId },
  });
  return {
    sessionId: tokenRow.sessionId,
    personId,
    recordId,
    presence: 'present' as const,
    source: 'qr' as const,
  };
}

export async function createAbsenceNotice(ctx: Ctx, body: CreateAbsenceNoticeBody) {
  assertCanIssueAbsenceNotice(ctx);
  const db = getDb();
  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();
  if (body.eventId) {
    const event = await repo.getEventById(db, ctx, body.eventId);
    if (!event) throw notFound();
  }
  const id = await repo.insertAbsenceNotice(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'events.absence_notice.created',
    entityType: 'absence_notice',
    entityId: id,
  });
  const row = await repo.getAbsenceNotice(db, ctx, id);
  if (!row) throw notFound();
  return {
    id: row.id,
    personId: row.personId,
    householdId: row.householdId,
    serviceDate: row.serviceDate,
    eventId: row.eventId,
    reason: row.reason,
    status: row.status,
  };
}

export async function listAbsenceNotices(ctx: Ctx, query: ListAbsenceNoticesQuery) {
  assertCanReadAttendance(ctx);
  const rows = await repo.listAbsenceNotices(getDb(), ctx, query);
  return {
    data: rows.map((row) => ({
      id: row.id,
      personId: row.personId,
      householdId: row.householdId,
      serviceDate: row.serviceDate,
      eventId: row.eventId,
      reason: row.reason,
      status: row.status,
    })),
  };
}

export async function createCorrectionRequest(
  ctx: Ctx,
  body: CreateCorrectionRequestBody,
) {
  assertCanRequestCorrection(ctx);
  const db = getDb();
  const session = await repo.getAttendanceSessionById(db, ctx, body.sessionId);
  if (!session) throw notFound();
  const person = await getPersonInChurch(db, ctx, body.personId);
  if (!person) throw notFound();

  const existing = await repo.findOpenCorrectionForPersonSession(
    db,
    body.personId,
    body.sessionId,
  );
  if (existing) {
    throw conflict('A pending correction already exists for this person and session.');
  }

  const id = await repo.insertCorrectionRequest(db, ctx, body);
  await writeAudit(db, ctx, {
    action: 'events.attendance_correction.created',
    entityType: 'attendance_correction_request',
    entityId: id,
  });
  const row = await repo.getCorrectionRequest(db, ctx, id);
  if (!row) throw notFound();
  return toCorrectionResponse(row);
}

export async function listCorrectionRequests(
  ctx: Ctx,
  query: ListCorrectionRequestsQuery,
) {
  assertCanReadAttendance(ctx);
  const rows = await repo.listCorrectionRequests(getDb(), ctx, query);
  return { data: rows.map(toCorrectionResponse) };
}

export async function resolveCorrectionRequest(
  ctx: Ctx,
  id: string,
  body: ResolveCorrectionRequestBody,
) {
  assertCanResolveCorrection(ctx);
  const db = getDb();
  const existing = await repo.getCorrectionRequest(db, ctx, id);
  if (!existing) throw notFound();
  if (existing.status !== 'pending') {
    throw conflict('Correction request is already resolved.');
  }

  if (body.action === 'approve') {
    await repo.upsertAttendancePresence(
      db,
      ctx,
      existing.sessionId,
      existing.personId,
      existing.requestedPresence,
    );
    const session = await repo.getAttendanceSessionById(db, ctx, existing.sessionId);
    if (session?.status === 'finalized') {
      await repo.upsertDayAggregateForSession(db, ctx, existing.sessionId);
    }
  }

  await repo.resolveCorrectionRequestRow(
    db,
    ctx,
    id,
    body.action === 'approve' ? 'approved' : 'rejected',
    body.resolutionNote,
  );
  await writeAudit(db, ctx, {
    action: `events.attendance_correction.${body.action}`,
    entityType: 'attendance_correction_request',
    entityId: id,
    metadata: { resolutionNote: body.resolutionNote ?? null },
  });
  const row = await repo.getCorrectionRequest(db, ctx, id);
  if (!row) throw notFound();
  return toCorrectionResponse(row);
}

async function loadSessionResponse(db: ReturnType<typeof getDb>, ctx: Ctx, sessionId: string) {
  const session = await repo.getAttendanceSessionById(db, ctx, sessionId);
  if (!session) throw notFound();
  const summary = await repo.getAttendanceSummary(db, sessionId);
  const recordCount = await repo.countAttendanceRecords(db, sessionId);
  return toAttendanceSessionResponse(session, { summary, recordCount });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

async function requireActorPersonId(ctx: Ctx): Promise<string> {
  const personId = await findPersonIdForUser(getDb(), ctx);
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

function resolveAttendanceWindow(query: { from?: string; to?: string }) {
  if (query.from && query.to) return { from: query.from, to: query.to };
  const defaults = defaultAttendanceRange(DEFAULT_ATTENDANCE_LOOKBACK_DAYS);
  return {
    from: query.from ?? defaults.from,
    to: query.to ?? defaults.to,
  };
}

export async function getMyAttendance(ctx: Ctx, query: MyAttendanceQuery) {
  assertCanReadOwnAttendance(ctx);
  const personId = await requireActorPersonId(ctx);
  const db = getDb();
  const { from, to } = resolveAttendanceWindow(query);

  const [serviceDates, presenceRows, noticeDates] = await Promise.all([
    repo.listFinalizedServiceDates(db, ctx, from, to),
    repo.listPersonPresenceByDate(db, ctx, personId, from, to),
    repo.listPersonAbsenceNoticeDates(db, ctx, personId, from, to),
  ]);

  const presentByDate = new Map(presenceRows.map((r) => [r.serviceDate, r.present]));
  const noticeSet = new Set(noticeDates);

  const calendar = serviceDates.map((serviceDate) => {
    const present = presentByDate.get(serviceDate) === true;
    const notice = noticeSet.has(serviceDate);
    return {
      serviceDate,
      status: present ? ('present' as const) : notice ? ('notice' as const) : ('absent' as const),
    };
  });

  const sessionsHeld = serviceDates.length;
  const presentCount = calendar.filter((d) => d.status === 'present').length;
  const band = bandForRate(presentCount, sessionsHeld);
  const householdId = await repo.findHouseholdIdForPerson(db, ctx, personId);

  return {
    personId,
    from,
    to,
    sessionsHeld,
    presentCount,
    noticeCount: calendar.filter((d) => d.status === 'notice').length,
    rate: sessionsHeld > 0 ? Number((presentCount / sessionsHeld).toFixed(3)) : null,
    band,
    suggestedNudge: nudgeForBand(band),
    thresholds: ATTENDANCE_BAND_THRESHOLDS,
    householdId,
    calendar,
  };
}

export async function getFamilyAttendance(ctx: Ctx, query: FamilyAttendanceQuery) {
  assertCanReadFamilyAttendance(ctx);
  const db = getDb();
  const actorPersonId = await findPersonIdForUser(db, ctx);
  const { from, to } = resolveAttendanceWindow(query);

  let householdId = query.householdId ?? null;
  if (!householdId) {
    if (!actorPersonId) {
      throw validationFailed([
        {
          field: 'householdId',
          code: 'required',
          message: 'householdId is required when the actor has no household',
        },
      ]);
    }
    householdId = await repo.findHouseholdIdForPerson(db, ctx, actorPersonId);
    if (!householdId) {
      throw validationFailed([
        {
          field: 'householdId',
          code: 'required',
          message: 'No household linked to this account; pass householdId',
        },
      ]);
    }
  }

  const canStaffRead =
    can(ctx, 'attendance:read') ||
    can(ctx, 'attendance:stats_leadership') ||
    can(ctx, 'households:read');
  if (!canStaffRead) {
    if (!actorPersonId) throw forbidden();
    const member = await repo.isPersonInHousehold(db, ctx, householdId, actorPersonId);
    if (!member) throw notFound();
  }

  const bundle = await repo.getHouseholdAttendanceBundle(db, ctx, householdId, from, to);
  if (!bundle) throw notFound();

  const presenceKey = (personId: string, serviceDate: string) =>
    `${personId}:${serviceDate}`;
  const presentSet = new Set(
    bundle.presence.filter((p) => p.present).map((p) => presenceKey(p.personId, p.serviceDate)),
  );
  const noticeByDate = new Map<string, number>();
  for (const n of bundle.notices) {
    noticeByDate.set(n.serviceDate, (noticeByDate.get(n.serviceDate) ?? 0) + 1);
  }

  const days = bundle.serviceDates.map((serviceDate) => {
    const adultsPresent = bundle.members.filter((m) =>
      presentSet.has(presenceKey(m.personId, serviceDate)),
    ).length;
    const notices = noticeByDate.get(serviceDate) ?? 0;
    const status = familyStatusForDay({
      adultCount: bundle.members.length,
      adultsPresent,
      notices,
    });
    return {
      serviceDate,
      status,
      adultsPresent,
      adultCount: bundle.members.length,
      childrenCount: bundle.children.length,
      notices,
      members: bundle.members.map((m) => ({
        personId: m.personId,
        displayName: m.displayName,
        status: presentSet.has(presenceKey(m.personId, serviceDate))
          ? ('present' as const)
          : bundle.notices.some(
                (n) => n.personId === m.personId && n.serviceDate === serviceDate,
              )
            ? ('notice' as const)
            : ('absent' as const),
      })),
    };
  });

  return {
    householdId: bundle.householdId,
    label: bundle.label,
    from,
    to,
    children: bundle.children,
    members: bundle.members,
    days,
  };
}

export async function getLeadershipAttendanceStats(
  ctx: Ctx,
  query: LeadershipAttendanceStatsQuery,
) {
  assertCanReadLeadershipAttendanceStats(ctx);
  const db = getDb();
  if (query.unitId) {
    const unit = await getUnitById(db, ctx, query.unitId);
    if (!unit) throw notFound();
  }

  const rows = await repo.leadershipAttendanceStats(db, ctx, {
    from: query.from,
    to: query.to,
    unitId: query.unitId,
    followUpOnly: query.followUpOnly,
  });

  const people = rows.map((r) => {
    const band = bandForRate(r.presentCount, r.sessionsHeld);
    return {
      personId: r.personId,
      displayName: r.displayName,
      presentCount: r.presentCount,
      sessionsHeld: r.sessionsHeld,
      rate: r.sessionsHeld > 0 ? Number((r.presentCount / r.sessionsHeld).toFixed(3)) : null,
      band,
      suggestedNudge: nudgeForBand(band),
      openNotices: r.openNotices,
    };
  });

  const filtered = query.followUpOnly
    ? people.filter((p) => p.band === 'irregular' || p.band === 'missing')
    : people;

  const byBand = {
    consistent: people.filter((p) => p.band === 'consistent').length,
    irregular: people.filter((p) => p.band === 'irregular').length,
    missing: people.filter((p) => p.band === 'missing').length,
    insufficient_data: people.filter((p) => p.band === 'insufficient_data').length,
  };

  await writeAudit(db, ctx, {
    action: 'events.attendance.stats_leadership.read',
    entityType: 'attendance_stats',
    metadata: {
      from: query.from ?? null,
      to: query.to ?? null,
      unitId: query.unitId ?? null,
      followUpOnly: query.followUpOnly ?? false,
    },
  });

  return {
    thresholds: ATTENDANCE_BAND_THRESHOLDS,
    sessionsHeld: people[0]?.sessionsHeld ?? 0,
    byBand,
    people: filtered,
  };
}
