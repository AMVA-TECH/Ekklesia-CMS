import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { churches } from '@/modules/churches/db-schema';
import { households } from '@/modules/households/db-schema';
import { people } from '@/modules/people/db-schema';
import { auditColumns } from '@/platform/db/columns';

/** Church membership for a person. */
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    householdId: uuid('household_id').references(() => households.id),
    membershipType: text('membership_type').notNull().default('individual'),
    status: text('status').notNull().default('visitor'),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('memberships_church_person_uidx').on(table.churchId, table.personId),
    index('memberships_church_status_idx').on(table.churchId, table.status),
  ],
);

export const membershipApplications = pgTable(
  'membership_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    householdId: uuid('household_id').references(() => households.id),
    status: text('status').notNull().default('pending'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('membership_applications_pending_uidx')
      .on(table.churchId, table.personId)
      .where(sql`${table.status} = 'pending'`),
    index('membership_applications_church_idx').on(table.churchId),
  ],
);

export const membershipDecisions = pgTable('membership_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => membershipApplications.id),
  decidedByUserId: uuid('decided_by_user_id').notNull(),
  outcome: text('outcome').notNull(),
  reason: text('reason'),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
});

export const membershipStatusHistory = pgTable('membership_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  membershipId: uuid('membership_id')
    .notNull()
    .references(() => memberships.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedByUserId: uuid('changed_by_user_id'),
  effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull().defaultNow(),
  reason: text('reason'),
});
