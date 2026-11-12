/** Leadership governance — appointment requests, meeting minutes, saved custom reports. */
import { date, jsonb, pgTable, text, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { people } from '@/modules/people/db-schema';
import {
  organisationalUnits,
  positions,
  appointments,
} from '@/modules/organisation/db-schema';
import { auditColumns } from '@/platform/db/columns';

/**
 * Request that someone be appointed (unit head / pastor nominates → SP decides).
 * On approve, an Appointment row is created.
 */
export const appointmentRequests = pgTable('appointment_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  positionId: uuid('position_id')
    .notNull()
    .references(() => positions.id),
  personId: uuid('person_id')
    .notNull()
    .references(() => people.id),
  organisationalUnitId: uuid('organisational_unit_id').references(
    () => organisationalUnits.id,
  ),
  requestedByUserId: uuid('requested_by_user_id').notNull(),
  // pending | approved | rejected | cancelled
  status: text('status').notNull().default('pending'),
  reason: text('reason'),
  decisionNote: text('decision_note'),
  decidedByUserId: uuid('decided_by_user_id'),
  resultingAppointmentId: uuid('resulting_appointment_id').references(
    () => appointments.id,
  ),
  ...auditColumns,
});

/** Leadership / board / ministry meeting minutes. */
export const meetingMinutes = pgTable('meeting_minutes', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  organisationalUnitId: uuid('organisational_unit_id').references(
    () => organisationalUnits.id,
  ),
  title: text('title').notNull(),
  meetingDate: date('meeting_date').notNull(),
  body: text('body').notNull(),
  /** Optional list of attendee person ids / display names. */
  attendees: jsonb('attendees').notNull().default([]),
  // draft | published | archived
  status: text('status').notNull().default('draft'),
  ...auditColumns,
});

/**
 * Saved “custom” report views — named catalogue report + filters for a church.
 * Does not invent free-form SQL; leaders save reusable views of approved report IDs.
 */
export const savedReports = pgTable(
  'saved_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    name: text('name').notNull(),
    reportId: text('report_id').notNull(),
    filters: jsonb('filters').notNull().default({}),
    createdByUserId: uuid('created_by_user_id').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('saved_reports_church_name_uidx').on(table.churchId, table.name),
  ],
);
