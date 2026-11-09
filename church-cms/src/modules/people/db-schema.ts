import {
  boolean,
  date,
  pgTable,
  text,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { churches } from '@/modules/churches/db-schema';
import { auditColumns } from '@/platform/db/columns';

/**
 * Global person identity (not tenant-scoped).
 * Church link is via membership / organisation_users.
 */
export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull(),
  fullName: text('full_name'),
  dateOfBirth: date('date_of_birth'),
  preferredLocale: text('preferred_locale').notNull().default('sw'),
  directoryOptIn: boolean('directory_opt_in').notNull().default(false),
  photoMediaId: uuid('photo_media_id'),
  ...auditColumns,
});

/** Contact channels for a person (phone E.164, email). */
export const personContacts = pgTable(
  'person_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    channel: text('channel').notNull(),
    value: text('value').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('person_contacts_person_channel_value_uidx').on(
      table.personId,
      table.channel,
      table.value,
    ),
    index('person_contacts_channel_value_idx').on(table.channel, table.value),
  ],
);

/**
 * Login account (global). Auth provider details TBD (ADR-0002).
 */
export const userAccounts = pgTable(
  'user_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email'),
    phoneE164: text('phone_e164'),
    status: text('status').notNull().default('active'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('user_accounts_email_uidx')
      .on(table.email)
      .where(sql`${table.email} is not null`),
    uniqueIndex('user_accounts_phone_uidx')
      .on(table.phoneE164)
      .where(sql`${table.phoneE164} is not null`),
  ],
);

/** Links a user account to a church and optionally a person. */
export const organisationUsers = pgTable(
  'organisation_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    userAccountId: uuid('user_account_id')
      .notNull()
      .references(() => userAccounts.id),
    personId: uuid('person_id').references(() => people.id),
    status: text('status').notNull().default('active'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('organisation_users_church_user_uidx').on(
      table.churchId,
      table.userAccountId,
    ),
    index('organisation_users_church_idx').on(table.churchId),
  ],
);
