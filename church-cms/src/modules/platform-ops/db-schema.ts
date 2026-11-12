import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditColumns } from '@/platform/db/columns';

/** Global platform operator membership (ADR-0003). Not per-church. */
export const platformOperators = pgTable('platform_operators', {
  id: uuid('id').primaryKey().defaultRandom(),
  userAccountId: uuid('user_account_id').notNull(),
  status: text('status').notNull().default('active'),
  permissions: jsonb('permissions')
    .$type<string[]>()
    .notNull()
    .default([
      'platform:read',
      'platform:admin',
      'platform:impersonate_tenant',
      'platform:security_read',
    ]),
  ...auditColumns,
});

/** Append-only platform audit. Never update/delete via app. */
export const platformAuditEvents = pgTable(
  'platform_audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id'),
    action: text('action').notNull(),
    outcome: text('outcome').notNull().default('success'),
    churchId: uuid('church_id'),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    requestId: text('request_id'),
    ipHash: text('ip_hash'),
    reason: text('reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('platform_audit_events_created_idx').on(table.createdAt),
    index('platform_audit_events_church_created_idx').on(table.churchId, table.createdAt),
    index('platform_audit_events_actor_created_idx').on(table.actorUserId, table.createdAt),
    index('platform_audit_events_action_created_idx').on(table.action, table.createdAt),
  ],
);

/** Security Hub-style findings queue. */
export const securityFindings = pgTable(
  'security_findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    severity: text('severity').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('open'),
    churchId: uuid('church_id'),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull().default({}),
    detectorKey: text('detector_key').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ackBy: uuid('ack_by'),
    ackAt: timestamp('ack_at', { withTimezone: true }),
  },
  (table) => [index('security_findings_status_severity_idx').on(table.status, table.severity)],
);

/** Daily growth/ops metric snapshots. */
export const platformMetricSnapshots = pgTable(
  'platform_metric_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotDate: date('snapshot_date').notNull(),
    metricKey: text('metric_key').notNull(),
    churchId: uuid('church_id'),
    value: integer('value').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('platform_metric_snapshots_day_key_church_uidx').on(
      table.snapshotDate,
      table.metricKey,
      table.churchId,
    ),
  ],
);
