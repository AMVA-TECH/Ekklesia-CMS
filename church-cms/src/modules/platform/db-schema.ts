import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { auditColumns } from '@/platform/db/columns';

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id').references(() => churches.id),
    storageKey: text('storage_key').notNull().unique(),
    contentType: text('content_type'),
    byteSize: integer('byte_size'),
    kind: text('kind').notNull().default('file'),
    ...auditColumns,
  },
  (table) => [index('media_assets_church_idx').on(table.churchId)],
);

export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    mediaAssetId: uuid('media_asset_id').references(() => mediaAssets.id),
    jobType: text('job_type').notNull(),
    status: text('status').notNull().default('queued'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [index('import_jobs_church_idx').on(table.churchId)],
);

export const importRowResults = pgTable(
  'import_row_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => importJobs.id),
    rowNumber: integer('row_number').notNull(),
    status: text('status').notNull(),
    payload: jsonb('payload'),
    errorCode: text('error_code'),
  },
  (table) => [
    uniqueIndex('import_row_results_job_row_uidx').on(table.jobId, table.rowNumber),
  ],
);

/** Append-only audit trail. Never soft-delete. */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id').references(() => churches.id),
    actorUserId: uuid('actor_user_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_events_church_created_idx').on(table.churchId, table.createdAt),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idempotency_keys_church_key_uidx').on(table.churchId, table.key),
  ],
);

export const domainEventOutbox = pgTable(
  'domain_event_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id').references(() => churches.id),
    eventName: text('event_name').notNull(),
    payload: jsonb('payload').notNull().default({}),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [index('domain_event_outbox_status_idx').on(table.status)],
);
