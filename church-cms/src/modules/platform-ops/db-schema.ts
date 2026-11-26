import { sql } from 'drizzle-orm';
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

/** Public church-tenant registration applications (not member join requests). */
export const churchRegistrationApplications = pgTable(
  'church_registration_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    status: text('status').notNull().default('draft'),
    officialName: text('official_name').notNull(),
    displayName: text('display_name'),
    website: text('website'),
    country: text('country').notNull().default('TZ'),
    location: text('location'),
    address: text('address'),
    denomination: text('denomination'),
    yearEstablished: integer('year_established'),
    description: text('description'),
    approxSize: text('approx_size'),
    branchCount: integer('branch_count'),
    representativeName: text('representative_name').notNull(),
    representativeRole: text('representative_role'),
    email: text('email').notNull(),
    phoneE164: text('phone_e164'),
    preferredContact: text('preferred_contact'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    emailVerifyTokenHash: text('email_verify_token_hash'),
    emailVerifyExpiresAt: timestamp('email_verify_expires_at', {
      withTimezone: true,
    }),
    applicantAccessTokenHash: text('applicant_access_token_hash'),
    assignedReviewerUserId: uuid('assigned_reviewer_user_id'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    decisionNote: text('decision_note'),
    decidedByUserId: uuid('decided_by_user_id'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    resultingChurchId: uuid('resulting_church_id'),
    idempotencyKey: text('idempotency_key'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    index('church_reg_apps_status_idx').on(table.status),
    index('church_reg_apps_email_idx').on(table.email),
  ],
);

export const churchRegistrationEvents = pgTable(
  'church_registration_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').notNull(),
    eventType: text('event_type').notNull(),
    actorUserId: uuid('actor_user_id'),
    note: text('note'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('church_reg_events_app_idx').on(table.applicationId, table.createdAt),
  ],
);

export const tenantProvisioningRequests = pgTable(
  'tenant_provisioning_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').notNull(),
    status: text('status').notNull().default('not_started'),
    idempotencyKey: text('idempotency_key').notNull(),
    churchId: uuid('church_id'),
    adminUserAccountId: uuid('admin_user_account_id'),
    adminInviteTokenHash: text('admin_invite_token_hash'),
    adminInviteExpiresAt: timestamp('admin_invite_expires_at', {
      withTimezone: true,
    }),
    errorMessage: text('error_message'),
    attemptCount: integer('attempt_count').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('tenant_provision_idempotency_uidx').on(table.idempotencyKey),
    index('tenant_provision_status_idx').on(table.status),
  ],
);

/** Non-human platform identities (workers, webhook clients, etc.). */
export const platformServiceAccounts = pgTable(
  'platform_service_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    purpose: text('purpose').notNull(),
    ownerUserId: uuid('owner_user_id'),
    status: text('status').notNull().default('active'),
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
    environment: text('environment').notNull().default('all'),
    credentialHash: text('credential_hash'),
    credentialPrefix: text('credential_prefix'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('platform_service_accounts_name_uidx').on(table.name),
    index('platform_service_accounts_status_idx').on(table.status),
  ],
);

/** Global / known third-party integration directory entries. */
export const platformIntegrations = pgTable(
  'platform_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    scope: text('scope').notNull().default('global'),
    description: text('description'),
    statusOverride: text('status_override'),
    configSummary: jsonb('config_summary')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [uniqueIndex('platform_integrations_code_uidx').on(table.code)],
);

/** Persisted webhook envelopes (incoming or outgoing evidence). */
export const platformWebhookEvents = pgTable(
  'platform_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    integrationCode: text('integration_code').notNull(),
    direction: text('direction').notNull(),
    eventType: text('event_type').notNull(),
    churchId: uuid('church_id'),
    correlationId: text('correlation_id'),
    idempotencyKey: text('idempotency_key'),
    payloadRedacted: jsonb('payload_redacted')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    httpStatus: integer('http_status'),
    processingStatus: text('processing_status').notNull().default('received'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    retryCount: integer('retry_count').notNull().default(0),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    index('platform_webhook_events_integration_idx').on(
      table.integrationCode,
      table.receivedAt,
    ),
    index('platform_webhook_events_status_idx').on(table.processingStatus),
  ],
);

/** Per-attempt history for webhook processing / delivery. */
export const platformWebhookAttempts = pgTable(
  'platform_webhook_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull(),
    attemptNumber: integer('attempt_number').notNull(),
    outcome: text('outcome').notNull(),
    httpStatus: integer('http_status'),
    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('platform_webhook_attempts_event_idx').on(
      table.eventId,
      table.attemptNumber,
    ),
  ],
);

/** Support centre cases. */
export const platformSupportCases = pgTable(
  'platform_support_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseNumber: text('case_number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('open'),
    priority: text('priority').notNull().default('medium'),
    severity: text('severity').notNull().default('medium'),
    churchId: uuid('church_id'),
    assignedOperatorUserId: uuid('assigned_operator_user_id'),
    reporterUserId: uuid('reporter_user_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('platform_support_cases_number_uidx').on(table.caseNumber),
    index('platform_support_cases_status_idx').on(table.status),
  ],
);

/** Controlled tenant support sessions (case-linked, time-bounded). */
export const platformSupportSessions = pgTable(
  'platform_support_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id'),
    churchId: uuid('church_id').notNull(),
    operatorUserId: uuid('operator_user_id').notNull(),
    purpose: text('purpose').notNull(),
    accessLevel: text('access_level').notNull().default('read'),
    status: text('status').notNull().default('active'),
    approvedByUserId: uuid('approved_by_user_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokeReason: text('revoke_reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    index('platform_support_sessions_church_idx').on(table.churchId, table.status),
    index('platform_support_sessions_operator_idx').on(
      table.operatorUserId,
      table.status,
    ),
  ],
);

/** Periodic / ad-hoc platform access reviews. */
export const platformAccessReviews = pgTable(
  'platform_access_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    scope: text('scope').notNull(),
    status: text('status').notNull().default('open'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    reviewerUserId: uuid('reviewer_user_id'),
    findingsSummary: text('findings_summary'),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [index('platform_access_reviews_status_idx').on(table.status)],
);

/** Time-limited emergency privilege grants. */
export const platformBreakGlassGrants = pgTable(
  'platform_break_glass_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operatorUserId: uuid('operator_user_id').notNull(),
    reason: text('reason').notNull(),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
    status: text('status').notNull().default('active'),
    approvedByUserId: uuid('approved_by_user_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokeReason: text('revoke_reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    index('platform_break_glass_operator_idx').on(table.operatorUserId, table.status),
  ],
);

/**
 * Platform configuration layers.
 * - global: Platform Settings (identity, auth policy mirrors, feature flags)
 * - defaults: suggested tenant defaults (never silent overwrite of church_settings)
 * - tenant: sparse platform-side suggestions/overrides for a church
 */
export const platformConfig = pgTable(
  'platform_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull(),
    churchId: uuid('church_id'),
    document: jsonb('document')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('platform_config_global_uidx')
      .on(table.scope)
      .where(sql`${table.scope} = 'global' and ${table.deletedAt} is null`),
    uniqueIndex('platform_config_defaults_uidx')
      .on(table.scope)
      .where(sql`${table.scope} = 'defaults' and ${table.deletedAt} is null`),
    uniqueIndex('platform_config_tenant_uidx')
      .on(table.churchId)
      .where(
        sql`${table.scope} = 'tenant' and ${table.churchId} is not null and ${table.deletedAt} is null`,
      ),
    index('platform_config_scope_idx').on(table.scope),
  ],
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
