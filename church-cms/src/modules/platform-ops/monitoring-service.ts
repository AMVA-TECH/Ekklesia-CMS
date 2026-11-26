import type { PlatformCtx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { assertPlatformMonitoringRead } from './policies';
import * as monRepo from './monitoring-repository';
import * as platformRepo from './repository';
import type {
  MonitoringCorrelateQuery,
  MonitoringJobsQuery,
} from './monitoring-schemas';

/**
 * Phase 5 monitoring overview from real DB evidence.
 * Application log aggregation is intentionally reported as not configured.
 */
export async function getMonitoringOverview(ctx: PlatformCtx) {
  assertPlatformMonitoringRead(ctx);
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    jobStatuses,
    deliveryStatuses,
    dbProbe,
    activeSessions,
    findings,
    failedProvisioning,
    failedWebhooks,
    auditCount,
    authFailures,
  ] = await Promise.all([
    monRepo.countMessageJobsByStatus(db, since),
    monRepo.countDeliveriesByStatus(db, since),
    monRepo.probeDatabase(db),
    monRepo.countActiveSessions(db),
    monRepo.countOpenFindings(db),
    monRepo.countFailedProvisioning(db, since),
    monRepo.countFailedWebhooks(db, since),
    monRepo.countPlatformAuditsSince(db, since),
    platformRepo.countAuthFailureAuditsSince(db, since),
  ]);

  const jobs: Record<string, number> = {};
  for (const row of jobStatuses) jobs[row.status] = Number(row.n);
  const deliveries: Record<string, number> = {};
  for (const row of deliveryStatuses) deliveries[row.status] = Number(row.n);

  const recentFailures = await monRepo.listRecentFailures(db, since, 20);

  await writePlatformAudit(db, ctx, {
    action: 'platform.monitoring.overview',
    entityType: 'platform',
    metadata: { windowHours: 24 },
  });

  return {
    windowHours: 24,
    environment:
      process.env.NEXT_PUBLIC_APP_ENV?.trim() ||
      process.env.NODE_ENV ||
      'development',
    stores: {
      applicationLogs: {
        configured: false,
        detail:
          'No centralized application log aggregation is connected. Log explorer stays unavailable until a real store exists.',
      },
      auditTrail: {
        configured: true,
        detail: 'platform_audit_events (+ church audit_events for tenant scope)',
        events24h: auditCount,
        href: '/platform/audit',
      },
      securityEvents: {
        configured: true,
        detail: 'security_findings + auth failure audits',
        openFindings: findings.open,
        criticalFindings: findings.critical,
        authFailures24h: authFailures,
        href: '/platform/security',
      },
    },
    database: dbProbe,
    sessions: { active: activeSessions },
    backgroundJobs: {
      byStatus: jobs,
      failed24h: jobs.failed ?? 0,
    },
    deliveries: {
      byStatus: deliveries,
    },
    integrations: {
      failedWebhooks24h: failedWebhooks,
      href: '/platform/integrations',
    },
    provisioning: {
      failed24h: failedProvisioning,
    },
    recentFailures: recentFailures.map((f) => ({
      id: f.id,
      kind: f.kind,
      status: f.status,
      detail: f.detail,
      churchId: f.churchId,
      at: f.at.toISOString(),
    })),
  };
}

export async function listMonitoringJobs(
  ctx: PlatformCtx,
  query: MonitoringJobsQuery,
) {
  assertPlatformMonitoringRead(ctx);
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await monRepo.listMessageJobs(db, {
    status: query.status,
    limit: query.limit,
    since,
  });
  await writePlatformAudit(db, ctx, {
    action: 'platform.monitoring.jobs.list',
    entityType: 'message_job',
    metadata: { status: query.status ?? null, count: rows.length },
  });
  const { churchNameById, labelOrDash } = await import('./display-labels');
  const churchNames = await churchNameById(
    db,
    rows.map((r) => r.churchId),
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      churchName: labelOrDash(churchNames, r.churchId),
      channel: r.channel,
      status: r.status,
      title: r.title,
      createdAt: r.createdAt.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
    })),
    windowDays: 7,
  };
}

/** Correlate audit + webhook evidence by request / correlation id. */
export async function correlateMonitoring(
  ctx: PlatformCtx,
  query: MonitoringCorrelateQuery,
) {
  assertPlatformMonitoringRead(ctx);
  const db = getDb();
  const requestId = query.requestId.trim();
  const [audits, webhooks] = await Promise.all([
    monRepo.findAuditsByRequestId(db, requestId),
    monRepo.findWebhooksByCorrelation(db, requestId),
  ]);

  await writePlatformAudit(db, ctx, {
    action: 'platform.monitoring.correlate',
    entityType: 'platform',
    metadata: sanitizeAuditMetadata({
      requestId,
      auditHits: audits.length,
      webhookHits: webhooks.length,
    }),
  });

  return {
    requestId,
    applicationLogs: {
      configured: false,
      items: [] as unknown[],
      detail: 'Application log store not configured — no log lines to attach.',
    },
    auditEvents: audits.map((a) => ({
      id: a.id,
      action: a.action,
      outcome: a.outcome,
      actorUserId: a.actorUserId,
      churchId: a.churchId,
      entityType: a.entityType,
      entityId: a.entityId,
      requestId: a.requestId,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
    })),
    webhookEvents: webhooks.map((w) => ({
      id: w.id,
      integrationCode: w.integrationCode,
      eventType: w.eventType,
      processingStatus: w.processingStatus,
      correlationId: w.correlationId,
      churchId: w.churchId,
      receivedAt: w.receivedAt.toISOString(),
      errorMessage: w.errorMessage,
    })),
    securityHint:
      'Open Security for findings and Fault for aggregate failure signals. These are separate from audit trails.',
  };
}
