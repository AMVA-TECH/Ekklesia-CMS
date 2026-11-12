/** Stage 4 — templates, announcements, jobs, preferences, consent. */
import { boolean, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { organisationalUnits } from '@/modules/organisation/db-schema';
import { people } from '@/modules/people/db-schema';
import { auditColumns } from '@/platform/db/columns';

export const messageTemplates = pgTable(

  'message_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    code: text('code').notNull(),
    channel: text('channel').notNull(), // sms | whatsapp | email | in_app
    locale: text('locale').notNull().default('sw'),
    body: text('body').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('message_templates_church_code_channel_locale_uidx').on(
      table.churchId,
      table.code,
      table.channel,
      table.locale,
    ),
  ],
);

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  // draft | pending_approval | published | rejected | archived
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  ...auditColumns,
});

export const announcementAudiences = pgTable('announcement_audiences', {
  id: uuid('id').primaryKey().defaultRandom(),
  announcementId: uuid('announcement_id')
    .notNull()
    .references(() => announcements.id),
  // all_members | organisational_unit
  audienceType: text('audience_type').notNull(),
  organisationalUnitId: uuid('organisational_unit_id').references(
    () => organisationalUnits.id,
  ),
});

export const messageJobs = pgTable('message_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  channel: text('channel').notNull(),
  templateId: uuid('template_id').references(() => messageTemplates.id),
  announcementId: uuid('announcement_id').references(() => announcements.id),
  /** Custom leadership blast text (Sunday reminders, etc.). */
  title: text('title'),
  body: text('body'),
  audienceType: text('audience_type'),
  organisationalUnitId: uuid('organisational_unit_id').references(
    () => organisationalUnits.id,
  ),
  // queued | sending | completed | failed | cancelled
  status: text('status').notNull().default('queued'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ...auditColumns,
});

export const messageDeliveries = pgTable('message_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => messageJobs.id),
  personId: uuid('person_id').references(() => people.id),
  channel: text('channel').notNull(),
  toAddress: text('to_address').notNull(),
  // pending | sent | delivered | failed
  status: text('status').notNull().default('pending'),
  providerRef: text('provider_ref'),
  error: text('error'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  ...auditColumns,
});

export const communicationPreferences = pgTable(
  'communication_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    smsOptIn: boolean('sms_opt_in').notNull().default(true),
    whatsappOptIn: boolean('whatsapp_opt_in').notNull().default(true),
    emailOptIn: boolean('email_opt_in').notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('communication_preferences_church_person_uidx').on(
      table.churchId,
      table.personId,
    ),
  ],
);

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id),
  personId: uuid('person_id')
    .notNull()
    .references(() => people.id),
  purpose: text('purpose').notNull(),
  status: text('status').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  ...auditColumns,
});
