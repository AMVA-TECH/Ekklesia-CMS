/** Stage 3 — organisation units, programmes, positions, appointments, delegations. */
import {
  type AnyPgColumn,
  date,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { people } from '@/modules/people/db-schema';
import { auditColumns } from '@/platform/db/columns';

/**
 * Departments/offices, ministries, and life groups (jumuiya).
 * kind: department | ministry | life_group
 */

export const organisationalUnits = pgTable(
  'organisational_units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => organisationalUnits.id),

    kind: text('kind').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('organisational_units_church_kind_name_uidx').on(
      table.churchId,
      table.kind,
      table.name,
    ),
  ],
);

/** What a ministry delivers. */
export const programmes = pgTable('programmes', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  ministryUnitId: uuid('ministry_unit_id')
    .notNull()
    .references(() => organisationalUnits.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  ...auditColumns,
});

/** Defined leadership/office position. */
export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    code: text('code').notNull(),
    title: text('title').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('positions_church_code_uidx').on(table.churchId, table.code),
  ],
);

/** Person appointed to a position for a period. Title ≠ system permission. */
export const appointments = pgTable('appointments', {
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
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  status: text('status').notNull().default('active'),
  ...auditColumns,
});

export const appointmentHistory = pgTable('appointment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id),
  changeType: text('change_type').notNull(),
  changedByUserId: uuid('changed_by_user_id'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  reason: text('reason'),
});

/** Temporary SP powers (e.g. Associate Pastor while SP away). */
export const delegations = pgTable('delegations', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  delegatorUserId: uuid('delegator_user_id').notNull(),
  delegateUserId: uuid('delegate_user_id').notNull(),
  grants: jsonb('grants').notNull().default([]),

  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  status: text('status').notNull().default('scheduled'),
  reason: text('reason'),
  ...auditColumns,
});
