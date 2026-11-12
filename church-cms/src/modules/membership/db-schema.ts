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
import { people, userAccounts } from '@/modules/people/db-schema';
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

/**
 * Public self-registration request for a church (DEC-032).
 * No login until status becomes approved and credentials are provisioned.
 */
export const churchJoinRequests = pgTable(
  'church_join_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    displayName: text('display_name').notNull(),
    email: text('email'),
    phoneE164: text('phone_e164'),
    preferredLocale: text('preferred_locale').notNull().default('sw'),
    status: text('status').notNull().default('pending'),
    decidedByUserId: uuid('decided_by_user_id'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionReason: text('decision_reason'),
    personId: uuid('person_id').references(() => people.id),
    userAccountId: uuid('user_account_id').references(() => userAccounts.id),
    ...auditColumns,
  },
  (table) => [
    index('church_join_requests_church_status_idx').on(
      table.churchId,
      table.status,
    ),
    uniqueIndex('church_join_requests_pending_email_uidx')
      .on(table.churchId, table.email)
      .where(
        sql`${table.status} = 'pending' AND ${table.email} is not null AND ${table.deletedAt} is null`,
      ),
    uniqueIndex('church_join_requests_pending_phone_uidx')
      .on(table.churchId, table.phoneE164)
      .where(
        sql`${table.status} = 'pending' AND ${table.phoneE164} is not null AND ${table.deletedAt} is null`,
      ),
  ],
);
