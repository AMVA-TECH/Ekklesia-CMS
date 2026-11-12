import { and, asc, count, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  absenceNotices,
  attendanceCorrectionRequests,
  attendanceDayAggregates,
  attendanceRecords,
  attendanceSessions,
  attendanceSummaries,
  eventRegistrations,
  eventTypes,
  events,
  sessionQrTokens,
} from './db-schema';
import type {
  CreateAbsenceNoticeBody,
  CreateCorrectionRequestBody,
  CreateEventBody,
  CreateEventTypeBody,
  ListAbsenceNoticesQuery,
  ListCorrectionRequestsQuery,
  ListEventsQuery,
  RecordAttendanceBody,
  UpsertAttendanceSummaryBody,
} from './schemas';

export function hashQrToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function mintQrToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function insertEventType(db: Db, ctx: Ctx, body: CreateEventTypeBody) {
  const id = newId();
  await db.insert(eventTypes).values({
    id,
    churchId: ctx.churchId,
    code: body.code,
    name: body.name,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getEventTypeById(db: Db, ctx: Ctx, eventTypeId: string) {
  const [row] = await db
    .select()
    .from(eventTypes)
    .where(
      and(
        eq(eventTypes.id, eventTypeId),
        eq(eventTypes.churchId, ctx.churchId),
        isNull(eventTypes.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listEventTypes(db: Db, ctx: Ctx) {
  return db
    .select()
    .from(eventTypes)
    .where(and(eq(eventTypes.churchId, ctx.churchId), isNull(eventTypes.deletedAt)))
    .orderBy(asc(eventTypes.name));
}

export async function getEventTypeByCode(db: Db, ctx: Ctx, code: string) {
  const [row] = await db
    .select()
    .from(eventTypes)
    .where(
      and(
        eq(eventTypes.churchId, ctx.churchId),
        eq(eventTypes.code, code),
        isNull(eventTypes.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertEvent(db: Db, ctx: Ctx, body: CreateEventBody) {
  const id = newId();
  await db.insert(events).values({
    id,
    churchId: ctx.churchId,
    eventTypeId: body.eventTypeId,
    organisationalUnitId: body.organisationalUnitId,
    title: body.title,
    description: body.description,
    serviceDate: body.serviceDate,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
    status: body.status ?? 'scheduled',
    posterMediaId: body.posterMediaId,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function updateEvent(
  db: Db,
  ctx: Ctx,
  eventId: string,
  patch: {
    title?: string;
    description?: string | null;
    serviceDate?: string;
    eventTypeId?: string | null;
    organisationalUnitId?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    status?: string;
    posterMediaId?: string | null;
  },
) {
  await db
    .update(events)
    .set({
      ...patch,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(and(eq(events.id, eventId), eq(events.churchId, ctx.churchId)));
}

export async function getEventById(db: Db, ctx: Ctx, eventId: string) {
  const [row] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.churchId, ctx.churchId),
        isNull(events.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getRegistrationForPerson(
  db: Db,
  eventId: string,
  personId: string,
) {
  const [row] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.personId, personId),
        isNull(eventRegistrations.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listRegistrationsForEvent(db: Db, eventId: string) {
  return db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.status, 'registered'),
        isNull(eventRegistrations.deletedAt),
      ),
    )
    .orderBy(asc(eventRegistrations.createdAt))
    .limit(500);
}

export async function insertRegistration(
  db: Db,
  ctx: Ctx,
  eventId: string,
  personId: string,
) {
  const id = newId();
  await db.insert(eventRegistrations).values({
    id,
    eventId,
    personId,
    status: 'registered',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function setRegistrationStatus(
  db: Db,
  ctx: Ctx,
  registrationId: string,
  status: string,
) {
  await db
    .update(eventRegistrations)
    .set({
      status,
      updatedBy: ctx.actor.userAccountId,
      updatedAt: sql`now()`,
    })
    .where(eq(eventRegistrations.id, registrationId));
}

export async function listEvents(db: Db, ctx: Ctx, query: ListEventsQuery) {
  const conditions = [eq(events.churchId, ctx.churchId), isNull(events.deletedAt)];
  if (query.from) conditions.push(gte(events.serviceDate, query.from));
  if (query.to) conditions.push(lte(events.serviceDate, query.to));

  return db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.serviceDate), asc(events.title))
    .limit(query.limit);
}

export async function insertAttendanceSession(
  db: Db,
  ctx: Ctx,
  eventId: string,
  mode: string,
) {
  const id = newId();
  await db.insert(attendanceSessions).values({
    id,
    churchId: ctx.churchId,
    eventId,
    mode,
    status: 'open',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getAttendanceSessionById(db: Db, ctx: Ctx, sessionId: string) {
  const [row] = await db
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.churchId, ctx.churchId),
        isNull(attendanceSessions.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertAttendanceRecord(
  db: Db,
  ctx: Ctx,
  sessionId: string,
  body: RecordAttendanceBody,
) {
  const id = newId();
  await db.insert(attendanceRecords).values({
    id,
    sessionId,
    personId: body.personId,
    presence: body.presence,
    source: body.source,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function countAttendanceRecords(db: Db, sessionId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(
      and(eq(attendanceRecords.sessionId, sessionId), isNull(attendanceRecords.deletedAt)),
    );
  return Number(row?.value ?? 0);
}

export async function upsertAttendanceSummary(
  db: Db,
  ctx: Ctx,
  sessionId: string,
  body: UpsertAttendanceSummaryBody,
) {
  const existing = await getAttendanceSummary(db, sessionId);
  if (existing) {
    await db
      .update(attendanceSummaries)
      .set({
        menCount: body.menCount,
        womenCount: body.womenCount,
        childrenCount: body.childrenCount,
        visitorsCount: body.visitorsCount,
        totalCount: body.totalCount,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: new Date(),
      })
      .where(eq(attendanceSummaries.sessionId, sessionId));
    return existing.id;
  }
  const id = newId();
  await db.insert(attendanceSummaries).values({
    id,
    sessionId,
    menCount: body.menCount,
    womenCount: body.womenCount,
    childrenCount: body.childrenCount,
    visitorsCount: body.visitorsCount,
    totalCount: body.totalCount,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getAttendanceSummary(db: Db, sessionId: string) {
  const [row] = await db
    .select()
    .from(attendanceSummaries)
    .where(
      and(
        eq(attendanceSummaries.sessionId, sessionId),
        isNull(attendanceSummaries.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function finalizeAttendanceSession(db: Db, ctx: Ctx, sessionId: string) {
  await db
    .update(attendanceSessions)
    .set({
      status: 'finalized',
      finalizedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.churchId, ctx.churchId),
      ),
    );
}

export async function listAttendanceSessionsForEvent(
  db: Db,
  ctx: Ctx,
  eventId: string,
) {
  return db
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.churchId, ctx.churchId),
        eq(attendanceSessions.eventId, eventId),
        isNull(attendanceSessions.deletedAt),
      ),
    )
    .orderBy(desc(attendanceSessions.recordedAt));
}

export async function listAttendanceRecords(db: Db, sessionId: string) {
  return db
    .select()
    .from(attendanceRecords)
    .where(
      and(eq(attendanceRecords.sessionId, sessionId), isNull(attendanceRecords.deletedAt)),
    )
    .orderBy(asc(attendanceRecords.checkedInAt));
}

export async function upsertDayAggregateForSession(
  db: Db,
  ctx: Ctx,
  sessionId: string,
) {
  const session = await getAttendanceSessionById(db, ctx, sessionId);
  if (!session) return;
  const event = await getEventById(db, ctx, session.eventId);
  if (!event) return;

  const summary = await getAttendanceSummary(db, sessionId);
  const recordTotal = await countAttendanceRecords(db, sessionId);
  const sessionTotal = summary?.totalCount ?? Number(recordTotal);

  const [existing] = await db
    .select()
    .from(attendanceDayAggregates)
    .where(
      and(
        eq(attendanceDayAggregates.churchId, ctx.churchId),
        eq(attendanceDayAggregates.serviceDate, event.serviceDate),
        isNull(attendanceDayAggregates.deletedAt),
      ),
    )
    .limit(1);

  const prevBreakdown =
    existing && typeof existing.breakdown === 'object' && existing.breakdown
      ? (existing.breakdown as Record<string, number>)
      : {};
  const breakdown = {
    ...prevBreakdown,
    [sessionId]: sessionTotal,
  };
  const totalCount = Object.values(breakdown).reduce((s, n) => s + Number(n || 0), 0);

  if (existing) {
    await db
      .update(attendanceDayAggregates)
      .set({
        totalCount,
        breakdown,
        updatedBy: ctx.actor.userAccountId,
        updatedAt: new Date(),
      })
      .where(eq(attendanceDayAggregates.id, existing.id));
    return;
  }

  await db.insert(attendanceDayAggregates).values({
    id: newId(),
    churchId: ctx.churchId,
    serviceDate: event.serviceDate,
    totalCount,
    breakdown,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
}

export async function insertQrToken(
  db: Db,
  ctx: Ctx,
  sessionId: string,
  expiresAt: Date,
) {
  const token = mintQrToken();
  const id = newId();
  await db.insert(sessionQrTokens).values({
    id,
    sessionId,
    tokenHash: hashQrToken(token),
    expiresAt,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return { id, token, expiresAt };
}

export async function findValidQrToken(db: Db, token: string) {
  const tokenHash = hashQrToken(token);
  const [row] = await db
    .select({
      id: sessionQrTokens.id,
      sessionId: sessionQrTokens.sessionId,
      expiresAt: sessionQrTokens.expiresAt,
      revokedAt: sessionQrTokens.revokedAt,
      churchId: attendanceSessions.churchId,
      status: attendanceSessions.status,
      mode: attendanceSessions.mode,
    })
    .from(sessionQrTokens)
    .innerJoin(
      attendanceSessions,
      eq(attendanceSessions.id, sessionQrTokens.sessionId),
    )
    .where(and(eq(sessionQrTokens.tokenHash, tokenHash), isNull(sessionQrTokens.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function insertAbsenceNotice(
  db: Db,
  ctx: Ctx,
  body: CreateAbsenceNoticeBody,
) {
  const id = newId();
  await db.insert(absenceNotices).values({
    id,
    churchId: ctx.churchId,
    personId: body.personId,
    householdId: body.householdId,
    serviceDate: body.serviceDate,
    eventId: body.eventId,
    reason: body.reason,
    status: 'notified',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function listAbsenceNotices(
  db: Db,
  ctx: Ctx,
  query: ListAbsenceNoticesQuery,
) {
  const conditions = [
    eq(absenceNotices.churchId, ctx.churchId),
    isNull(absenceNotices.deletedAt),
  ];
  if (query.from) conditions.push(gte(absenceNotices.serviceDate, query.from));
  if (query.to) conditions.push(lte(absenceNotices.serviceDate, query.to));
  if (query.status) conditions.push(eq(absenceNotices.status, query.status));
  return db
    .select()
    .from(absenceNotices)
    .where(and(...conditions))
    .orderBy(desc(absenceNotices.serviceDate))
    .limit(query.limit);
}

export async function getAbsenceNotice(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select()
    .from(absenceNotices)
    .where(
      and(
        eq(absenceNotices.id, id),
        eq(absenceNotices.churchId, ctx.churchId),
        isNull(absenceNotices.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findPersonIdByPhone(db: Db, phone: string) {
  const result = await db.execute(sql`
    SELECT pc.person_id AS "personId"
    FROM person_contacts pc
    WHERE pc.channel = 'phone'
      AND pc.value = ${phone}
      AND pc.deleted_at IS NULL
    LIMIT 1
  `);
  const rows = (
    Array.isArray(result)
      ? result
      : ((result as unknown as { rows?: Record<string, unknown>[] }).rows ?? [])
  ) as Record<string, unknown>[];
  const personId = rows[0]?.personId;
  return personId ? String(personId) : null;
}

export async function insertGuestPerson(
  db: Db,
  ctx: Ctx,
  displayName: string,
  phone?: string,
) {
  const personId = newId();
  const { people, personContacts } = await import('@/modules/people/db-schema');
  const { memberships } = await import('@/modules/membership/db-schema');
  await db.insert(people).values({
    id: personId,
    displayName,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  if (phone) {
    await db.insert(personContacts).values({
      id: newId(),
      personId,
      channel: 'phone',
      value: phone,
      isPrimary: true,
      createdBy: ctx.actor.userAccountId,
      updatedBy: ctx.actor.userAccountId,
    });
  }
  await db.insert(memberships).values({
    id: newId(),
    churchId: ctx.churchId,
    personId,
    membershipType: 'individual',
    status: 'visitor',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return personId;
}

export async function upsertQrAttendanceRecord(
  db: Db,
  ctx: Ctx,
  sessionId: string,
  personId: string,
  checkInName?: string,
  checkInPhone?: string,
) {
  const [existing] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.sessionId, sessionId),
        eq(attendanceRecords.personId, personId),
        isNull(attendanceRecords.deletedAt),
      ),
    )
    .limit(1);
  if (existing) return existing.id;
  const id = newId();
  await db.insert(attendanceRecords).values({
    id,
    sessionId,
    personId,
    presence: 'present',
    source: 'qr',
    checkInName,
    checkInPhone,
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function upsertAttendancePresence(
  db: Db,
  ctx: Ctx,
  sessionId: string,
  personId: string,
  presence: string,
) {
  const [existing] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.sessionId, sessionId),
        eq(attendanceRecords.personId, personId),
        isNull(attendanceRecords.deletedAt),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(attendanceRecords)
      .set({
        presence,
        source: 'manual',
        updatedBy: ctx.actor.userAccountId,
        updatedAt: new Date(),
      })
      .where(eq(attendanceRecords.id, existing.id));
    return existing.id;
  }
  const id = newId();
  await db.insert(attendanceRecords).values({
    id,
    sessionId,
    personId,
    presence,
    source: 'manual',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function insertCorrectionRequest(
  db: Db,
  ctx: Ctx,
  body: CreateCorrectionRequestBody,
) {
  const id = newId();
  await db.insert(attendanceCorrectionRequests).values({
    id,
    personId: body.personId,
    sessionId: body.sessionId,
    requestedPresence: body.requestedPresence,
    note: body.note,
    status: 'pending',
    createdBy: ctx.actor.userAccountId,
    updatedBy: ctx.actor.userAccountId,
  });
  return id;
}

export async function getCorrectionRequest(db: Db, ctx: Ctx, id: string) {
  const [row] = await db
    .select({
      id: attendanceCorrectionRequests.id,
      personId: attendanceCorrectionRequests.personId,
      sessionId: attendanceCorrectionRequests.sessionId,
      requestedPresence: attendanceCorrectionRequests.requestedPresence,
      status: attendanceCorrectionRequests.status,
      note: attendanceCorrectionRequests.note,
      resolutionNote: attendanceCorrectionRequests.resolutionNote,
      resolvedByUserId: attendanceCorrectionRequests.resolvedByUserId,
      resolvedAt: attendanceCorrectionRequests.resolvedAt,
      createdAt: attendanceCorrectionRequests.createdAt,
      churchId: attendanceSessions.churchId,
    })
    .from(attendanceCorrectionRequests)
    .innerJoin(
      attendanceSessions,
      eq(attendanceSessions.id, attendanceCorrectionRequests.sessionId),
    )
    .where(
      and(
        eq(attendanceCorrectionRequests.id, id),
        eq(attendanceSessions.churchId, ctx.churchId),
        isNull(attendanceCorrectionRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listCorrectionRequests(
  db: Db,
  ctx: Ctx,
  query: ListCorrectionRequestsQuery,
) {
  return db
    .select({
      id: attendanceCorrectionRequests.id,
      personId: attendanceCorrectionRequests.personId,
      sessionId: attendanceCorrectionRequests.sessionId,
      requestedPresence: attendanceCorrectionRequests.requestedPresence,
      status: attendanceCorrectionRequests.status,
      note: attendanceCorrectionRequests.note,
      resolutionNote: attendanceCorrectionRequests.resolutionNote,
      resolvedByUserId: attendanceCorrectionRequests.resolvedByUserId,
      resolvedAt: attendanceCorrectionRequests.resolvedAt,
      createdAt: attendanceCorrectionRequests.createdAt,
    })
    .from(attendanceCorrectionRequests)
    .innerJoin(
      attendanceSessions,
      eq(attendanceSessions.id, attendanceCorrectionRequests.sessionId),
    )
    .where(
      and(
        eq(attendanceSessions.churchId, ctx.churchId),
        eq(attendanceCorrectionRequests.status, query.status),
        isNull(attendanceCorrectionRequests.deletedAt),
      ),
    )
    .orderBy(desc(attendanceCorrectionRequests.createdAt))
    .limit(query.limit);
}

export async function resolveCorrectionRequestRow(
  db: Db,
  ctx: Ctx,
  id: string,
  status: 'approved' | 'rejected',
  resolutionNote?: string,
) {
  await db
    .update(attendanceCorrectionRequests)
    .set({
      status,
      resolutionNote,
      resolvedByUserId: ctx.actor.userAccountId,
      resolvedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
      updatedAt: new Date(),
    })
    .where(eq(attendanceCorrectionRequests.id, id));
}

export async function findOpenCorrectionForPersonSession(
  db: Db,
  personId: string,
  sessionId: string,
) {
  const [row] = await db
    .select()
    .from(attendanceCorrectionRequests)
    .where(
      and(
        eq(attendanceCorrectionRequests.personId, personId),
        eq(attendanceCorrectionRequests.sessionId, sessionId),
        eq(attendanceCorrectionRequests.status, 'pending'),
        isNull(attendanceCorrectionRequests.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return ((result as { rows?: Record<string, unknown>[] }).rows ?? []);
}

/** Distinct service dates with finalized sessions in range. */
export async function listFinalizedServiceDates(
  db: Db,
  ctx: Ctx,
  from: string,
  to: string,
) {
  const result = await db.execute(sql`
    SELECT DISTINCT e.service_date AS "serviceDate"
    FROM attendance_sessions s
    JOIN events e ON e.id = s.event_id
    WHERE s.church_id = ${ctx.churchId}::uuid
      AND s.status = 'finalized'
      AND s.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND e.service_date >= ${from}
      AND e.service_date <= ${to}
    ORDER BY e.service_date
  `);
  return rowsOf(result).map((r) => String(r.serviceDate));
}

export async function listPersonPresenceByDate(
  db: Db,
  ctx: Ctx,
  personId: string,
  from: string,
  to: string,
) {
  const result = await db.execute(sql`
    SELECT e.service_date AS "serviceDate",
           bool_or(ar.presence IN ('present', 'late')) AS present
    FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id
    JOIN events e ON e.id = s.event_id
    WHERE s.church_id = ${ctx.churchId}::uuid
      AND ar.person_id = ${personId}::uuid
      AND ar.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND e.service_date >= ${from}
      AND e.service_date <= ${to}
    GROUP BY e.service_date
    ORDER BY e.service_date
  `);
  return rowsOf(result).map((r) => ({
    serviceDate: String(r.serviceDate),
    present: Boolean(r.present),
  }));
}

export async function listPersonAbsenceNoticeDates(
  db: Db,
  ctx: Ctx,
  personId: string,
  from: string,
  to: string,
) {
  const result = await db.execute(sql`
    SELECT DISTINCT an.service_date AS "serviceDate"
    FROM absence_notices an
    WHERE an.church_id = ${ctx.churchId}::uuid
      AND an.person_id = ${personId}::uuid
      AND an.deleted_at IS NULL
      AND an.service_date >= ${from}
      AND an.service_date <= ${to}
    ORDER BY an.service_date
  `);
  return rowsOf(result).map((r) => String(r.serviceDate));
}

export async function findHouseholdIdForPerson(db: Db, ctx: Ctx, personId: string) {
  const result = await db.execute(sql`
    SELECT hm.household_id AS "householdId"
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.person_id = ${personId}::uuid
      AND h.church_id = ${ctx.churchId}::uuid
      AND hm.deleted_at IS NULL
      AND h.deleted_at IS NULL
    LIMIT 1
  `);
  const row = rowsOf(result)[0];
  return row ? String(row.householdId) : null;
}

export async function isPersonInHousehold(
  db: Db,
  ctx: Ctx,
  householdId: string,
  personId: string,
) {
  const result = await db.execute(sql`
    SELECT 1 AS ok
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.household_id = ${householdId}::uuid
      AND hm.person_id = ${personId}::uuid
      AND h.church_id = ${ctx.churchId}::uuid
      AND hm.deleted_at IS NULL
      AND h.deleted_at IS NULL
    LIMIT 1
  `);
  return rowsOf(result).length > 0;
}

export async function getHouseholdAttendanceBundle(
  db: Db,
  ctx: Ctx,
  householdId: string,
  from: string,
  to: string,
) {
  const household = await db.execute(sql`
    SELECT id, label
    FROM households
    WHERE id = ${householdId}::uuid
      AND church_id = ${ctx.churchId}::uuid
      AND deleted_at IS NULL
    LIMIT 1
  `);
  const householdRow = rowsOf(household)[0];
  if (!householdRow) return null;

  const members = rowsOf(
    await db.execute(sql`
      SELECT hm.person_id AS "personId", pe.display_name AS "displayName"
      FROM household_members hm
      JOIN people pe ON pe.id = hm.person_id
      WHERE hm.household_id = ${householdId}::uuid
        AND hm.deleted_at IS NULL
        AND pe.deleted_at IS NULL
      ORDER BY pe.display_name
    `),
  ).map((r) => ({
    personId: String(r.personId),
    displayName: String(r.displayName ?? ''),
  }));

  const children = rowsOf(
    await db.execute(sql`
      SELECT id, name, age
      FROM household_children
      WHERE household_id = ${householdId}::uuid
        AND deleted_at IS NULL
      ORDER BY name
    `),
  ).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    age: Number(r.age),
  }));

  const presence = rowsOf(
    await db.execute(sql`
      SELECT ar.person_id AS "personId",
             e.service_date AS "serviceDate",
             bool_or(ar.presence IN ('present', 'late')) AS present
      FROM attendance_records ar
      JOIN attendance_sessions s ON s.id = ar.session_id
      JOIN events e ON e.id = s.event_id
      JOIN household_members hm ON hm.person_id = ar.person_id
      WHERE s.church_id = ${ctx.churchId}::uuid
        AND hm.household_id = ${householdId}::uuid
        AND hm.deleted_at IS NULL
        AND ar.deleted_at IS NULL
        AND s.deleted_at IS NULL
        AND e.deleted_at IS NULL
        AND e.service_date >= ${from}
        AND e.service_date <= ${to}
      GROUP BY ar.person_id, e.service_date
    `),
  ).map((r) => ({
    personId: String(r.personId),
    serviceDate: String(r.serviceDate),
    present: Boolean(r.present),
  }));

  const notices = rowsOf(
    await db.execute(sql`
      SELECT an.person_id AS "personId", an.service_date AS "serviceDate"
      FROM absence_notices an
      WHERE an.church_id = ${ctx.churchId}::uuid
        AND an.deleted_at IS NULL
        AND an.service_date >= ${from}
        AND an.service_date <= ${to}
        AND (
          an.household_id = ${householdId}::uuid
          OR an.person_id IN (
            SELECT person_id FROM household_members
            WHERE household_id = ${householdId}::uuid AND deleted_at IS NULL
          )
        )
    `),
  ).map((r) => ({
    personId: String(r.personId),
    serviceDate: String(r.serviceDate),
  }));

  const serviceDates = await listFinalizedServiceDates(db, ctx, from, to);

  return {
    householdId: String(householdRow.id),
    label: String(householdRow.label ?? ''),
    members,
    children,
    presence,
    notices,
    serviceDates,
  };
}

export async function leadershipAttendanceStats(
  db: Db,
  ctx: Ctx,
  opts: { from?: string; to?: string; unitId?: string; followUpOnly?: boolean },
) {
  const result = await db.execute(sql`
    WITH sessions AS (
      SELECT s.id
      FROM attendance_sessions s
      JOIN events e ON e.id = s.event_id
      WHERE s.church_id = ${ctx.churchId}::uuid
        AND s.status = 'finalized'
        AND s.deleted_at IS NULL
        ${opts.from ? sql`AND e.service_date >= ${opts.from}` : sql``}
        ${opts.to ? sql`AND e.service_date <= ${opts.to}` : sql``}
        ${opts.unitId ? sql`AND e.organisational_unit_id = ${opts.unitId}::uuid` : sql``}
    ),
    session_count AS (
      SELECT count(*)::int AS n FROM sessions
    ),
    population AS (
      ${
        opts.unitId
          ? sql`
        SELECT p.person_id AS "personId", pe.display_name AS "displayName"
        FROM participations p
        JOIN people pe ON pe.id = p.person_id
        WHERE p.church_id = ${ctx.churchId}::uuid
          AND p.organisational_unit_id = ${opts.unitId}::uuid
          AND p.status = 'active'
          AND p.deleted_at IS NULL
      `
          : sql`
        SELECT m.person_id AS "personId", pe.display_name AS "displayName"
        FROM memberships m
        JOIN people pe ON pe.id = m.person_id
        WHERE m.church_id = ${ctx.churchId}::uuid
          AND m.status = 'active'
          AND m.deleted_at IS NULL
      `
      }
    ),
    attended AS (
      SELECT ar.person_id AS "personId", count(*)::int AS "presentCount"
      FROM attendance_records ar
      WHERE ar.session_id IN (SELECT id FROM sessions)
        AND ar.presence IN ('present', 'late')
        AND ar.deleted_at IS NULL
      GROUP BY ar.person_id
    ),
    open_notices AS (
      SELECT an.person_id AS "personId", count(*)::int AS "openNotices"
      FROM absence_notices an
      WHERE an.church_id = ${ctx.churchId}::uuid
        AND an.status IN ('notified', 'open', 'pending')
        AND an.deleted_at IS NULL
        ${opts.from ? sql`AND an.service_date >= ${opts.from}` : sql``}
        ${opts.to ? sql`AND an.service_date <= ${opts.to}` : sql``}
      GROUP BY an.person_id
    )
    SELECT
      pop."personId",
      pop."displayName",
      coalesce(att."presentCount", 0)::int AS "presentCount",
      (SELECT n FROM session_count) AS "sessionsHeld",
      coalesce(n."openNotices", 0)::int AS "openNotices"
    FROM population pop
    LEFT JOIN attended att ON att."personId" = pop."personId"
    LEFT JOIN open_notices n ON n."personId" = pop."personId"
    ORDER BY pop."displayName"
  `);

  return rowsOf(result).map((r) => ({
    personId: String(r.personId),
    displayName: String(r.displayName ?? ''),
    presentCount: Number(r.presentCount ?? 0),
    sessionsHeld: Number(r.sessionsHeld ?? 0),
    openNotices: Number(r.openNotices ?? 0),
  }));
}
