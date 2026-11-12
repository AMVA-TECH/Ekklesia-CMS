/** Stage 3 — ministry / life-group participation. */
import { date, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { churches } from '@/modules/churches/db-schema';
import { organisationalUnits } from '@/modules/organisation/db-schema';
import { people } from '@/modules/people/db-schema';
import { auditColumns } from '@/platform/db/columns';

/** Request to join a ministry or life group. */

export const participationRequests = pgTable(
  'participation_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    organisationalUnitId: uuid('organisational_unit_id')
      .notNull()
      .references(() => organisationalUnits.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    status: text('status').notNull().default('pending'),
    decidedByUserId: uuid('decided_by_user_id'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('participation_requests_open_uidx')
      .on(table.organisationalUnitId, table.personId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

/** Active/ended participation in a ministry or life group. */
export const participations = pgTable(
  'participations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    organisationalUnitId: uuid('organisational_unit_id')
      .notNull()
      .references(() => organisationalUnits.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    roleInUnit: text('role_in_unit'),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    status: text('status').notNull().default('active'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('participations_unit_person_active_uidx')
      .on(table.organisationalUnitId, table.personId)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const participationHistory = pgTable('participation_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  participationId: uuid('participation_id')
    .notNull()
    .references(() => participations.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedByUserId: uuid('changed_by_user_id'),
  effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull().defaultNow(),
});
