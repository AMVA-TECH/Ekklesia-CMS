import type { PlatformCtx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { getEnv } from '@/platform/config';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { conflict, notFound } from '@/platform/errors';
import {
  applyBriqWebhookEvent,
  applyProviderDeliveryUpdate,
} from '@/modules/messaging';
import {
  assertPlatformIntegrationsRead,
  assertPlatformIntegrationsWrite,
} from './policies';
import * as repo from './integrations-repository';
import {
  INTEGRATION_CATALOGUE,
  redactPayload,
  type IntegrationHealth,
} from './integrations-catalogue';
import type {
  ListWebhookEventsQuery,
  ReplayWebhookBody,
} from './integrations-schemas';

function envConfigEvidence(): Record<string, Record<string, unknown>> {
  const env = getEnv();
  const smtpConfigured = Boolean(
    process.env.AUTH_SMTP_HOST?.trim() &&
      process.env.AUTH_SMTP_USER?.trim() &&
      process.env.AUTH_SMTP_PASS?.trim(),
  );
  return {
    'notify.stub': {
      active: env.NOTIFY_PROVIDER === 'stub',
      provider: env.NOTIFY_PROVIDER,
    },
    'notify.briq': {
      active: env.NOTIFY_PROVIDER === 'briq',
      configured: Boolean(env.BRIQ_API_KEY && env.BRIQ_SENDER_ID),
      webhookSecretConfigured: Boolean(
        env.BRIQ_WEBHOOK_SECRET ?? env.NOTIFY_WEBHOOK_SECRET,
      ),
      baseUrl: env.BRIQ_BASE_URL,
    },
    'notify.smsgate': {
      active: env.NOTIFY_PROVIDER === 'smsgate',
      configured: Boolean(
        env.SMSGATE_URL && env.SMSGATE_USERNAME && env.SMSGATE_PASSWORD,
      ),
    },
    'notify.http': {
      active: env.NOTIFY_PROVIDER === 'http',
      smsUrlConfigured: Boolean(env.NOTIFY_SMS_URL),
      whatsappUrlConfigured: Boolean(env.NOTIFY_WHATSAPP_URL),
      webhookSecretConfigured: Boolean(env.NOTIFY_WEBHOOK_SECRET),
    },
    'auth.smtp': {
      configured: smtpConfigured,
    },
    'auth.better_auth': {
      secretConfigured: Boolean(env.BETTER_AUTH_SECRET),
    },
    payments: {
      configured: false,
    },
  };
}

function healthFromEvidence(input: {
  configured: boolean;
  active?: boolean;
  succeeded: number;
  failed: number;
  total: number;
  statusOverride?: string | null;
}): IntegrationHealth {
  if (input.statusOverride && ['operational', 'degraded', 'unavailable', 'unknown'].includes(input.statusOverride)) {
    return input.statusOverride as IntegrationHealth;
  }
  if (!input.configured) return 'unknown';
  if (input.active === false) return 'unknown';
  if (input.total === 0) return 'unknown';
  const failRate = input.failed / input.total;
  if (failRate >= 0.5 && input.failed >= 3) return 'unavailable';
  if (failRate >= 0.15 || input.failed >= 2) return 'degraded';
  if (input.succeeded > 0) return 'operational';
  return 'unknown';
}

/** Ensure catalogue rows exist and refresh non-secret config evidence. */
export async function syncIntegrationDirectory(): Promise<void> {
  const db = getDb();
  const evidence = envConfigEvidence();
  for (const entry of INTEGRATION_CATALOGUE) {
    await repo.upsertIntegrationFromCatalogue(
      db,
      entry,
      evidence[entry.code] ?? {},
    );
  }
}

export async function listIntegrations(ctx: PlatformCtx) {
  assertPlatformIntegrationsRead(ctx);
  await syncIntegrationDirectory();
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await repo.listIntegrationRows(db);
  const delivery = await repo.countMessageDeliveryOutcomesSince(db, since);

  const items = await Promise.all(
    rows.map(async (row) => {
      const webhook = await repo.countWebhookOutcomesSince(
        db,
        row.code,
        since,
      );
      const summary = (row.configSummary ?? {}) as Record<string, unknown>;
      const configured = Boolean(
        summary.configured ??
          summary.active ??
          summary.secretConfigured ??
          summary.smsUrlConfigured,
      );
      const messagingCodes = new Set([
        'notify.stub',
        'notify.briq',
        'notify.smsgate',
        'notify.http',
      ]);
      const evidence = messagingCodes.has(row.code)
        ? {
            webhook,
            deliveries24h: delivery,
          }
        : { webhook };

      const health = healthFromEvidence({
        configured,
        active: summary.active as boolean | undefined,
        succeeded:
          webhook.succeeded +
          (messagingCodes.has(row.code)
            ? delivery.sent + delivery.delivered
            : 0),
        failed:
          webhook.failed +
          (messagingCodes.has(row.code) ? delivery.failed : 0),
        total:
          webhook.total + (messagingCodes.has(row.code) ? delivery.total : 0),
        statusOverride: row.statusOverride,
      });

      return {
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        scope: row.scope,
        description: row.description,
        health,
        configSummary: summary,
        evidence,
      };
    }),
  );

  await writePlatformAudit(db, ctx, {
    action: 'platform.integrations.list',
    entityType: 'platform_integration',
    metadata: { count: items.length },
  });

  return {
    items,
    window: '24h',
    note: 'Health is derived from webhook attempts and message delivery outcomes — not mere reachability.',
  };
}

export async function listWebhookEvents(
  ctx: PlatformCtx,
  query: ListWebhookEventsQuery,
) {
  assertPlatformIntegrationsRead(ctx);
  const db = getDb();
  const rows = await repo.listWebhookEvents(db, query);
  await writePlatformAudit(db, ctx, {
    action: 'platform.webhooks.list',
    entityType: 'platform_webhook_event',
    metadata: { count: rows.length, ...query },
  });
  return {
    items: rows.map((r) => ({
      id: r.id,
      integrationCode: r.integrationCode,
      direction: r.direction,
      eventType: r.eventType,
      churchId: r.churchId,
      correlationId: r.correlationId,
      httpStatus: r.httpStatus,
      processingStatus: r.processingStatus,
      receivedAt: r.receivedAt.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
      retryCount: r.retryCount,
      errorMessage: r.errorMessage,
      durationMs: r.durationMs,
      // payload omitted from list for brevity
    })),
  };
}

export async function getWebhookEvent(ctx: PlatformCtx, eventId: string) {
  assertPlatformIntegrationsRead(ctx);
  const db = getDb();
  const event = await repo.findWebhookById(db, eventId);
  if (!event) throw notFound();
  const attempts = await repo.listWebhookAttempts(db, eventId);
  return {
    event: {
      id: event.id,
      integrationCode: event.integrationCode,
      direction: event.direction,
      eventType: event.eventType,
      churchId: event.churchId,
      correlationId: event.correlationId,
      idempotencyKey: event.idempotencyKey,
      payloadRedacted: event.payloadRedacted,
      httpStatus: event.httpStatus,
      processingStatus: event.processingStatus,
      receivedAt: event.receivedAt.toISOString(),
      processedAt: event.processedAt?.toISOString() ?? null,
      retryCount: event.retryCount,
      errorMessage: event.errorMessage,
      durationMs: event.durationMs,
      metadata: sanitizeAuditMetadata(event.metadata ?? {}),
    },
    attempts: attempts.map((a) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      outcome: a.outcome,
      httpStatus: a.httpStatus,
      durationMs: a.durationMs,
      errorMessage: a.errorMessage,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

/**
 * Persist + process an incoming webhook (called from public webhook routes).
 * Idempotent when idempotencyKey is provided.
 */
export async function recordAndProcessIncomingWebhook(input: {
  integrationCode: string;
  eventType: string;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  payload: unknown;
  process: () => Promise<{ churchId?: string | null; result?: unknown }>;
}): Promise<{
  eventId: string;
  replayed: boolean;
  processingStatus: string;
}> {
  const db = getDb();
  if (input.idempotencyKey) {
    const existing = await repo.findWebhookByIdempotencyKey(
      db,
      input.idempotencyKey,
    );
    if (existing) {
      return {
        eventId: existing.id,
        replayed: true,
        processingStatus: existing.processingStatus,
      };
    }
  }

  const eventId = newId();
  const started = Date.now();
  await repo.insertWebhookEvent(db, {
    id: eventId,
    integrationCode: input.integrationCode,
    direction: 'incoming',
    eventType: input.eventType,
    correlationId: input.correlationId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    payloadRedacted: redactPayload(input.payload),
    processingStatus: 'processing',
  });

  try {
    const outcome = await input.process();
    const durationMs = Date.now() - started;
    await repo.updateWebhookEvent(db, eventId, {
      processingStatus: 'succeeded',
      httpStatus: 200,
      durationMs,
      processedAt: new Date(),
      errorMessage: null,
      churchId: outcome.churchId ?? null,
    });
    await repo.insertWebhookAttempt(db, {
      eventId,
      attemptNumber: 1,
      outcome: 'succeeded',
      httpStatus: 200,
      durationMs,
      metadata: sanitizeAuditMetadata({
        result: outcome.result as Record<string, unknown> | undefined,
      }),
    });
    return { eventId, replayed: false, processingStatus: 'succeeded' };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message =
      error instanceof Error ? error.message.slice(0, 400) : 'processing_failed';
    await repo.updateWebhookEvent(db, eventId, {
      processingStatus: 'failed',
      httpStatus: 500,
      durationMs,
      processedAt: new Date(),
      errorMessage: message,
    });
    await repo.insertWebhookAttempt(db, {
      eventId,
      attemptNumber: 1,
      outcome: 'failed',
      httpStatus: 500,
      durationMs,
      errorMessage: message,
    });
    throw error;
  }
}

export async function replayWebhookEvent(
  ctx: PlatformCtx,
  eventId: string,
  body: ReplayWebhookBody,
) {
  assertPlatformIntegrationsWrite(ctx);
  const db = getDb();
  const event = await repo.findWebhookById(db, eventId);
  if (!event) throw notFound();
  if (event.direction !== 'incoming') {
    throw conflict('Only incoming webhook events can be replayed.');
  }

  const attemptNumber = await repo.nextAttemptNumber(db, eventId);
  const started = Date.now();
  const payload = event.payloadRedacted ?? {};

  try {
    let result: unknown;
    if (event.integrationCode === 'notify.briq') {
      const data = (payload.data ?? {}) as Record<string, unknown>;
      result = await applyBriqWebhookEvent({
        event: String(payload.event ?? event.eventType),
        jobId: typeof data.job_id === 'string' ? data.job_id : undefined,
        messageId:
          typeof data.message_id === 'string' ? data.message_id : undefined,
        error: typeof data.status === 'string' ? data.status : undefined,
      });
    } else if (event.integrationCode === 'notify.http') {
      result = await applyProviderDeliveryUpdate({
        providerRef: String(
          (payload as { providerRef?: string }).providerRef ?? '',
        ),
        status: ((payload as { status?: string }).status === 'failed'
          ? 'failed'
          : 'delivered') as 'delivered' | 'failed',
        error: (payload as { error?: string }).error,
      });
    } else {
      throw conflict(
        `Replay is not implemented for integration ${event.integrationCode}.`,
      );
    }

    const durationMs = Date.now() - started;
    await repo.updateWebhookEvent(db, eventId, {
      processingStatus: 'replayed',
      retryCount: event.retryCount + 1,
      processedAt: new Date(),
      durationMs,
      errorMessage: null,
      httpStatus: 200,
    });
    await repo.insertWebhookAttempt(db, {
      eventId,
      attemptNumber,
      outcome: 'succeeded',
      httpStatus: 200,
      durationMs,
      metadata: { replay: true, reason: body.reason },
    });
    await writePlatformAudit(db, ctx, {
      action: 'platform.webhook.replay',
      entityType: 'platform_webhook_event',
      entityId: eventId,
      metadata: sanitizeAuditMetadata({
        reason: body.reason,
        integrationCode: event.integrationCode,
        result,
      }),
    });
    return { eventId, attemptNumber, status: 'replayed' as const, result };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message =
      error instanceof Error ? error.message.slice(0, 400) : 'replay_failed';
    await repo.updateWebhookEvent(db, eventId, {
      processingStatus: 'failed',
      retryCount: event.retryCount + 1,
      processedAt: new Date(),
      durationMs,
      errorMessage: message,
      httpStatus: 500,
    });
    await repo.insertWebhookAttempt(db, {
      eventId,
      attemptNumber,
      outcome: 'failed',
      httpStatus: 500,
      durationMs,
      errorMessage: message,
      metadata: { replay: true, reason: body.reason },
    });
    await writePlatformAudit(db, ctx, {
      action: 'platform.webhook.replay',
      entityType: 'platform_webhook_event',
      entityId: eventId,
      metadata: sanitizeAuditMetadata({
        reason: body.reason,
        outcome: 'failed',
        error: message,
      }),
    });
    throw error;
  }
}
