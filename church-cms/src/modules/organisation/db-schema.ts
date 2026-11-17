/** Stage 3 — organisation units, programmes, positions, appointments, delegations. */
import {
  type AnyPgColumn,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { people } from '@/modules/people/db-schema';
import { auditColumns } from '@/platform/db/columns';

/**
 * Departments/offices, ministries, branches, teams, and life groups.
 * kind: department | ministry | life_group | branch | team
 */

export const organisationalUnits = pgTable(
  'organisational_units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => organisationalUnits.id),

    /** Server-generated human code (ORG-###### or MIN-######). Immutable. */
    code: text('code').notNull(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'),
    /** Extensible flags (e.g. { proposed: true } for unverified functional areas). */
    metadata: jsonb('metadata').notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('organisational_units_church_kind_name_uidx').on(
      table.churchId,
      table.kind,
      table.name,
    ),
    uniqueIndex('organisational_units_church_code_uidx').on(
      table.churchId,
      table.code,
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

/** Defined leadership/office position. Title ≠ system permission. */
export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    /** Server-generated POS-###### (legacy snake_case codes may remain). */
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    organisationalUnitId: uuid('organisational_unit_id').references(
      () => organisationalUnits.id,
    ),
    reportsToPositionId: uuid('reports_to_position_id').references(
      (): AnyPgColumn => positions.id,
    ),
    status: text('status').notNull().default('active'),
    /** single = one active occupant; multiple = several allowed. */
    occupancyPolicy: text('occupancy_policy').notNull().default('single'),
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
  appointmentKind: text('appointment_kind').notNull().default('substantive'),
  notes: text('notes'),
  appointedByUserId: uuid('appointed_by_user_id'),
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

/** Per-church monotonic counters for human-readable codes. */
export const churchCodeSequences = pgTable(
  'church_code_sequences',
  {
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    namespace: text('namespace').notNull(),
    nextValue: integer('next_value').notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.churchId, table.namespace] })],
);
