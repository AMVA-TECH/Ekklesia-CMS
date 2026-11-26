import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { messageDeliveries, messageJobs } from '@/modules/messaging/db-schema';
import {
  platformIntegrations,
  platformWebhookAttempts,
  platformWebhookEvents,
} from './db-schema';
import type { IntegrationCatalogueEntry } from './integrations-catalogue';

export async function listIntegrationRows(db: Db) {
  return db
    .select()
    .from(platformIntegrations)
    .where(isNull(platformIntegrations.deletedAt))
    .orderBy(platformIntegrations.code);
}

export async function upsertIntegrationFromCatalogue(
  db: Db,
  entry: IntegrationCatalogueEntry,
  configSummary: Record<string, unknown>,
) {
  const existing = await db
    .select({ id: platformIntegrations.id })
    .from(platformIntegrations)
    .where(
      and(
        eq(platformIntegrations.code, entry.code),
        isNull(platformIntegrations.deletedAt),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(platformIntegrations)
      .set({
        name: entry.name,
        category: entry.category,
        scope: entry.scope,
        description: entry.description,
        configSummary,
        updatedAt: new Date(),
      })
      .where(eq(platformIntegrations.id, existing[0].id));
    return existing[0].id;
  }

  const id = newId();
  await db.insert(platformIntegrations).values({
    id,
    code: entry.code,
    name: entry.name,
    category: entry.category,
    scope: entry.scope,
    description: entry.description,
    configSummary,
  });
  return id;
}

export async function findWebhookByIdempotencyKey(db: Db, key: string) {
  const rows = await db
    .select()
    .from(platformWebhookEvents)
    .where(
      and(
        eq(platformWebhookEvents.idempotencyKey, key),
        isNull(platformWebhookEvents.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findWebhookById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(platformWebhookEvents)
    .where(
      and(
        eq(platformWebhookEvents.id, id),
        isNull(platformWebhookEvents.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertWebhookEvent(
  db: Db,
  input: {
    id: string;
    integrationCode: string;
    direction: string;
    eventType: string;
    churchId?: string | null;
    correlationId?: string | null;
    idempotencyKey?: string | null;
    payloadRedacted: Record<string, unknown>;
    httpStatus?: number | null;
    processingStatus: string;
    errorMessage?: string | null;
    durationMs?: number | null;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(platformWebhookEvents).values({
    id: input.id,
    integrationCode: input.integrationCode,
    direction: input.direction,
    eventType: input.eventType,
    churchId: input.churchId ?? null,
    correlationId: input.correlationId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    payloadRedacted: input.payloadRedacted,
    httpStatus: input.httpStatus ?? null,
    processingStatus: input.processingStatus,
    processedAt:
      input.processingStatus === 'succeeded' ||
      input.processingStatus === 'failed'
        ? new Date()
        : null,
    errorMessage: input.errorMessage ?? null,
    durationMs: input.durationMs ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function updateWebhookEvent(
  db: Db,
  id: string,
  patch: Partial<{
    processingStatus: string;
    httpStatus: number | null;
    errorMessage: string | null;
    durationMs: number | null;
    processedAt: Date | null;
    retryCount: number;
    churchId: string | null;
  }>,
) {
  await db
    .update(platformWebhookEvents)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(platformWebhookEvents.id, id));
}

export async function insertWebhookAttempt(
  db: Db,
  input: {
    eventId: string;
    attemptNumber: number;
    outcome: string;
    httpStatus?: number | null;
    durationMs?: number | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(platformWebhookAttempts).values({
    id: newId(),
    eventId: input.eventId,
    attemptNumber: input.attemptNumber,
    outcome: input.outcome,
    httpStatus: input.httpStatus ?? null,
    durationMs: input.durationMs ?? null,
    errorMessage: input.errorMessage ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function listWebhookEvents(
  db: Db,
  query: {
    integrationCode?: string;
    direction?: string;
    status?: string;
    limit: number;
  },
) {
  const conditions = [isNull(platformWebhookEvents.deletedAt)];
  if (query.integrationCode) {
    conditions.push(
      eq(platformWebhookEvents.integrationCode, query.integrationCode),
    );
  }
  if (query.direction) {
    conditions.push(eq(platformWebhookEvents.direction, query.direction));
  }
  if (query.status) {
    conditions.push(eq(platformWebhookEvents.processingStatus, query.status));
  }
  return db
    .select()
    .from(platformWebhookEvents)
    .where(and(...conditions))
    .orderBy(desc(platformWebhookEvents.receivedAt))
    .limit(query.limit);
}

export async function listWebhookAttempts(db: Db, eventId: string) {
  return db
    .select()
    .from(platformWebhookAttempts)
    .where(eq(platformWebhookAttempts.eventId, eventId))
    .orderBy(platformWebhookAttempts.attemptNumber);
}

export async function countWebhookOutcomesSince(
  db: Db,
  integrationCode: string,
  since: Date,
): Promise<{ succeeded: number; failed: number; total: number }> {
  const rows = await db
    .select({
      status: platformWebhookEvents.processingStatus,
      n: count(),
    })
    .from(platformWebhookEvents)
    .where(
      and(
        eq(platformWebhookEvents.integrationCode, integrationCode),
        gte(platformWebhookEvents.receivedAt, since),
        isNull(platformWebhookEvents.deletedAt),
      ),
    )
    .groupBy(platformWebhookEvents.processingStatus);

  let succeeded = 0;
  let failed = 0;
  let total = 0;
  for (const row of rows) {
    const n = Number(row.n);
    total += n;
    if (row.status === 'succeeded' || row.status === 'replayed') succeeded += n;
    if (row.status === 'failed') failed += n;
  }
  return { succeeded, failed, total };
}

export async function countMessageDeliveryOutcomesSince(
  db: Db,
  since: Date,
): Promise<{ sent: number; delivered: number; failed: number; total: number }> {
  const rows = await db
    .select({
      status: messageDeliveries.status,
      n: count(),
    })
    .from(messageDeliveries)
    .where(gte(messageDeliveries.createdAt, since))
    .groupBy(messageDeliveries.status);

  let sent = 0;
  let delivered = 0;
  let failed = 0;
  let total = 0;
  for (const row of rows) {
    const n = Number(row.n);
    total += n;
    if (row.status === 'sent') sent += n;
    if (row.status === 'delivered') delivered += n;
    if (row.status === 'failed') failed += n;
  }
  return { sent, delivered, failed, total };
}

export async function recentFailedJobs(db: Db, since: Date, limit: number) {
  return db
    .select({
      id: messageJobs.id,
      churchId: messageJobs.churchId,
      channel: messageJobs.channel,
      status: messageJobs.status,
      completedAt: messageJobs.completedAt,
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
    .limit(limit);
}

export async function nextAttemptNumber(db: Db, eventId: string) {
  const rows = await db
    .select({
      n: sql<number>`coalesce(max(${platformWebhookAttempts.attemptNumber}), 0)`,
    })
    .from(platformWebhookAttempts)
    .where(eq(platformWebhookAttempts.eventId, eventId));
  return Number(rows[0]?.n ?? 0) + 1;
}
