import { and, count, desc, eq, gte, isNull, or, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { churches } from '@/modules/churches/db-schema';
import { messageDeliveries, messageJobs } from '@/modules/messaging/db-schema';
import { session as authSession } from '@/platform/auth/db-schema';
import {
  platformAuditEvents,
  platformWebhookEvents,
  securityFindings,
  tenantProvisioningRequests,
} from './db-schema';

export async function countMessageJobsByStatus(db: Db, since: Date) {
  return db
    .select({
      status: messageJobs.status,
      n: count(),
    })
    .from(messageJobs)
    .where(
      and(gte(messageJobs.createdAt, since), isNull(messageJobs.deletedAt)),
    )
    .groupBy(messageJobs.status);
}

export async function listMessageJobs(
  db: Db,
  query: {
    status?: string;
    channel?: string;
    limit: number;
    since?: Date;
  },
) {
  const conditions = [isNull(messageJobs.deletedAt)];
  if (query.status) conditions.push(eq(messageJobs.status, query.status));
  if (query.channel) conditions.push(eq(messageJobs.channel, query.channel));
  if (query.since) conditions.push(gte(messageJobs.createdAt, query.since));
  return db
    .select({
      id: messageJobs.id,
      churchId: messageJobs.churchId,
      channel: messageJobs.channel,
      status: messageJobs.status,
      title: messageJobs.title,
      body: messageJobs.body,
      createdAt: messageJobs.createdAt,
      startedAt: messageJobs.startedAt,
      completedAt: messageJobs.completedAt,
    })
    .from(messageJobs)
    .where(and(...conditions))
    .orderBy(desc(messageJobs.createdAt))
    .limit(query.limit);
}

export async function countDeliveriesByStatus(db: Db, since: Date) {
  return db
    .select({
      status: messageDeliveries.status,
      n: count(),
    })
    .from(messageDeliveries)
    .where(gte(messageDeliveries.createdAt, since))
    .groupBy(messageDeliveries.status);
}

export async function listMessageDeliveries(
  db: Db,
  query: { status?: string; limit: number; since?: Date },
) {
  const conditions = [];
  if (query.status) conditions.push(eq(messageDeliveries.status, query.status));
  if (query.since) conditions.push(gte(messageDeliveries.createdAt, query.since));
  const where = conditions.length ? and(...conditions) : undefined;
  return db
    .select({
      id: messageDeliveries.id,
      jobId: messageDeliveries.jobId,
      channel: messageDeliveries.channel,
      toAddress: messageDeliveries.toAddress,
      status: messageDeliveries.status,
      providerRef: messageDeliveries.providerRef,
      error: messageDeliveries.error,
      sentAt: messageDeliveries.sentAt,
      createdAt: messageDeliveries.createdAt,
    })
    .from(messageDeliveries)
    .where(where)
    .orderBy(desc(messageDeliveries.createdAt))
    .limit(query.limit);
}

export async function countActiveSessions(db: Db) {
  const rows = await db
    .select({ n: count() })
    .from(authSession)
    .where(sql`${authSession.expiresAt} > now()`);
  return Number(rows[0]?.n ?? 0);
}

export async function countOpenFindings(db: Db) {
  const openRows = await db
    .select({ n: count() })
    .from(securityFindings)
    .where(eq(securityFindings.status, 'open'));
  const criticalRows = await db
    .select({ n: count() })
    .from(securityFindings)
    .where(
      and(
        eq(securityFindings.status, 'open'),
        eq(securityFindings.severity, 'critical'),
      ),
    );
  return {
    open: Number(openRows[0]?.n ?? 0),
    critical: Number(criticalRows[0]?.n ?? 0),
  };
}

export async function countFailedProvisioning(db: Db, since: Date) {
  const rows = await db
    .select({ n: count() })
    .from(tenantProvisioningRequests)
    .where(
      and(
        eq(tenantProvisioningRequests.status, 'failed'),
        gte(tenantProvisioningRequests.updatedAt, since),
        isNull(tenantProvisioningRequests.deletedAt),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function countFailedWebhooks(db: Db, since: Date) {
  const rows = await db
    .select({ n: count() })
    .from(platformWebhookEvents)
    .where(
      and(
        eq(platformWebhookEvents.processingStatus, 'failed'),
        gte(platformWebhookEvents.receivedAt, since),
        isNull(platformWebhookEvents.deletedAt),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function countPlatformAuditsSince(db: Db, since: Date) {
  const rows = await db
    .select({ n: count() })
    .from(platformAuditEvents)
    .where(gte(platformAuditEvents.createdAt, since));
  return Number(rows[0]?.n ?? 0);
}

export async function findAuditsByRequestId(db: Db, requestId: string) {
  return db
    .select({
      id: platformAuditEvents.id,
      action: platformAuditEvents.action,
      outcome: platformAuditEvents.outcome,
      actorUserId: platformAuditEvents.actorUserId,
      churchId: platformAuditEvents.churchId,
      entityType: platformAuditEvents.entityType,
      entityId: platformAuditEvents.entityId,
      requestId: platformAuditEvents.requestId,
      reason: platformAuditEvents.reason,
      createdAt: platformAuditEvents.createdAt,
    })
    .from(platformAuditEvents)
    .where(eq(platformAuditEvents.requestId, requestId))
    .orderBy(desc(platformAuditEvents.createdAt))
    .limit(100);
}

export async function findWebhooksByCorrelation(db: Db, correlationId: string) {
  return db
    .select({
      id: platformWebhookEvents.id,
      integrationCode: platformWebhookEvents.integrationCode,
      eventType: platformWebhookEvents.eventType,
      processingStatus: platformWebhookEvents.processingStatus,
      correlationId: platformWebhookEvents.correlationId,
      churchId: platformWebhookEvents.churchId,
      receivedAt: platformWebhookEvents.receivedAt,
      errorMessage: platformWebhookEvents.errorMessage,
    })
    .from(platformWebhookEvents)
    .where(
      and(
        or(
          eq(platformWebhookEvents.correlationId, correlationId),
          sql`${platformWebhookEvents.metadata}->>'requestId' = ${correlationId}`,
        ),
        isNull(platformWebhookEvents.deletedAt),
      ),
    )
    .orderBy(desc(platformWebhookEvents.receivedAt))
    .limit(50);
}

export async function listRecentFailures(db: Db, since: Date, limit: number) {
  const [jobs, webhooks, provision] = await Promise.all([
    db
      .select({
        id: messageJobs.id,
        kind: sql<string>`'message_job'`,
        status: messageJobs.status,
        detail: messageJobs.channel,
        churchId: messageJobs.churchId,
        at: messageJobs.createdAt,
      })
      .from(messageJobs)
      .where(
        and(
          eq(messageJobs.status, 'failed'),
          gte(messageJobs.createdAt, since),
          isNull(messageJobs.deletedAt),
        ),
      )
      .orderBy(desc(messageJobs.createdAt))
      .limit(limit),
    db
      .select({
        id: platformWebhookEvents.id,
        kind: sql<string>`'webhook'`,
        status: platformWebhookEvents.processingStatus,
        detail: platformWebhookEvents.eventType,
        churchId: platformWebhookEvents.churchId,
        at: platformWebhookEvents.receivedAt,
      })
      .from(platformWebhookEvents)
      .where(
        and(
          eq(platformWebhookEvents.processingStatus, 'failed'),
          gte(platformWebhookEvents.receivedAt, since),
          isNull(platformWebhookEvents.deletedAt),
        ),
      )
      .orderBy(desc(platformWebhookEvents.receivedAt))
      .limit(limit),
    db
      .select({
        id: tenantProvisioningRequests.id,
        kind: sql<string>`'provisioning'`,
        status: tenantProvisioningRequests.status,
        detail: tenantProvisioningRequests.errorMessage,
        churchId: tenantProvisioningRequests.churchId,
        at: tenantProvisioningRequests.updatedAt,
      })
      .from(tenantProvisioningRequests)
      .where(
        and(
          eq(tenantProvisioningRequests.status, 'failed'),
          gte(tenantProvisioningRequests.updatedAt, since),
          isNull(tenantProvisioningRequests.deletedAt),
        ),
      )
      .orderBy(desc(tenantProvisioningRequests.updatedAt))
      .limit(limit),
  ]);

  return [...jobs, ...webhooks, ...provision]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

/** Lightweight DB evidence — connectivity via church count. */
export async function probeDatabase(db: Db): Promise<{
  ok: boolean;
  latencyMs: number;
  churches: number;
}> {
  const started = Date.now();
  try {
    const rows = await db
      .select({ n: count() })
      .from(churches)
      .where(isNull(churches.deletedAt));
    return {
      ok: true,
      latencyMs: Date.now() - started,
      churches: Number(rows[0]?.n ?? 0),
    };
  } catch {
    return { ok: false, latencyMs: Date.now() - started, churches: 0 };
  }
}
