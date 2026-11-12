/** Stage 3 — events, registrations, and attendance. */
import {
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { organisationalUnits } from '@/modules/organisation/db-schema';
import { households } from '@/modules/households/db-schema';
import { people } from '@/modules/people/db-schema';
import { mediaAssets } from '@/modules/platform/db-schema';
import { auditColumns } from '@/platform/db/columns';

export const eventTypes = pgTable(

  'event_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('event_types_church_code_uidx').on(table.churchId, table.code),
  ],
);

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  eventTypeId: uuid('event_type_id').references(() => eventTypes.id),
  organisationalUnitId: uuid('organisational_unit_id').references(
    () => organisationalUnits.id,
  ),
  title: text('title').notNull(),
  description: text('description'),
  serviceDate: date('service_date').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  status: text('status').notNull().default('scheduled'),
  posterMediaId: uuid('poster_media_id').references(() => mediaAssets.id),
  ...auditColumns,
});

export const eventRegistrations = pgTable(
  'event_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    status: text('status').notNull().default('registered'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('event_registrations_event_person_uidx').on(
      table.eventId,
      table.personId,
    ),
  ],
);

/**
 * mode: headcount | roll_call | qr_mixed
 * status: open | finalized
 */
export const attendanceSessions = pgTable('attendance_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id),
  mode: text('mode').notNull(),
  status: text('status').notNull().default('open'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  ...auditColumns,
});

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    presence: text('presence').notNull().default('present'),
    // qr | roll_call | manual
    source: text('source').notNull(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
    checkInName: text('check_in_name'),
    checkInPhone: text('check_in_phone'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('attendance_records_session_person_uidx').on(
      table.sessionId,
      table.personId,
    ),
  ],
);

export const attendanceSummaries = pgTable(
  'attendance_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id)
      .unique(),
    menCount: integer('men_count').notNull().default(0),
    womenCount: integer('women_count').notNull().default(0),
    childrenCount: integer('children_count').notNull().default(0),
    visitorsCount: integer('visitors_count').notNull().default(0),
    totalCount: integer('total_count').notNull().default(0),
    ...auditColumns,
  },
);

export const sessionQrTokens = pgTable(
  'session_qr_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [uniqueIndex('session_qr_tokens_token_hash_uidx').on(table.tokenHash)],
);

export const attendanceDayAggregates = pgTable(
  'attendance_day_aggregates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    serviceDate: date('service_date').notNull(),
    totalCount: integer('total_count').notNull().default(0),
    breakdown: jsonb('breakdown').notNull().default({}),

    ...auditColumns,
  },
  (table) => [
    uniqueIndex('attendance_day_aggregates_church_date_uidx').on(
      table.churchId,
      table.serviceDate,
    ),
  ],
);

export const attendanceCorrectionRequests = pgTable(
  'attendance_correction_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id),
    /** present | absent | late — claimed correction */
    requestedPresence: text('requested_presence').notNull().default('present'),
    status: text('status').notNull().default('pending'),
    note: text('note'),
    resolutionNote: text('resolution_note'),
    resolvedByUserId: uuid('resolved_by_user_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...auditColumns,
  },
);

export const absenceNotices = pgTable('absence_notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  personId: uuid('person_id')
    .notNull()
    .references(() => people.id),
  householdId: uuid('household_id').references(() => households.id),
  serviceDate: date('service_date').notNull(),
  eventId: uuid('event_id').references(() => events.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('notified'),
  ...auditColumns,
});
