import { randomUUID } from 'node:crypto';

import type { PlatformCtx } from '@/platform/auth/ctx';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { getDb } from '@/platform/db/client';
import { getEnv } from '@/platform/config';
import { forbidden } from '@/platform/errors';
import { getNotifyAdapter } from '@/platform/notify';
import {
  assertPlatformIntegrationsRead,
  assertPlatformIntegrationsWrite,
  assertPlatformMonitoringRead,
} from './policies';
import { INTEGRATION_CATALOGUE } from './integrations-catalogue';
import * as monitoringRepo from './monitoring-repository';
import { confirmOperatorPin } from './reauth-service';
import type { MessagingTestBody } from './schemas';

function messagingProviders() {
  return INTEGRATION_CATALOGUE.filter(
    (row) => row.category === 'messaging' || row.category === 'email',
  );
}

/** Platform messaging ops snapshot — evidence only, no invented health. */
export async function getMessagingOpsOverview(ctx: PlatformCtx) {
  // Either integrations or monitoring read is enough to view the hub.
  try {
    assertPlatformIntegrationsRead(ctx);
  } catch {
    assertPlatformMonitoringRead(ctx);
  }
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const [jobCounts, deliveryCounts, recentJobs, failedJobs] = await Promise.all([
    monitoringRepo.countMessageJobsByStatus(db, since),
    monitoringRepo.countDeliveriesByStatus(db, since),
    monitoringRepo.listMessageJobs(db, { limit: 25, since }),
    monitoringRepo.listMessageJobs(db, {
      status: 'failed',
      limit: 25,
      since,
    }),
  ]);

  const env = getEnv();
  const notifyConfigured = Boolean(
    env.NOTIFY_PROVIDER && env.NOTIFY_PROVIDER !== 'stub',
  );
  const smtpConfigured = Boolean(
    process.env.AUTH_SMTP_HOST?.trim() &&
      process.env.AUTH_SMTP_USER?.trim() &&
      process.env.AUTH_SMTP_PASS?.trim(),
  );

  return {
    providers: messagingProviders().map((p) => ({
      code: p.code,
      name: p.name,
      category: p.category,
      description: p.description,
    })),
    notify: {
      provider: env.NOTIFY_PROVIDER ?? 'stub',
      configured: notifyConfigured,
      testRecipients: env.SMS_TEST_RECIPIENTS ?? null,
      emailConfigured: smtpConfigured,
      emailTestRecipients: env.EMAIL_TEST_RECIPIENTS ?? null,
    },
    last24h: {
      jobsByStatus: Object.fromEntries(
        jobCounts.map((r) => [r.status, Number(r.n)]),
      ),
      deliveriesByStatus: Object.fromEntries(
        deliveryCounts.map((r) => [r.status, Number(r.n)]),
      ),
    },
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      churchId: j.churchId,
      channel: j.channel,
      status: j.status,
      title: j.title,
      createdAt: j.createdAt.toISOString(),
    })),
    failedJobs: failedJobs.map((j) => ({
      id: j.id,
      churchId: j.churchId,
      channel: j.channel,
      status: j.status,
      title: j.title,
      createdAt: j.createdAt.toISOString(),
    })),
  };
}

export async function listMessagingDeliveries(
  ctx: PlatformCtx,
  query: { status?: string; limit?: number } = {},
) {
  try {
    assertPlatformIntegrationsRead(ctx);
  } catch {
    assertPlatformMonitoringRead(ctx);
  }
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const rows = await monitoringRepo.listMessageDeliveries(db, {
    status: query.status,
    limit: query.limit ?? 100,
    since,
  });
  const { churchNameById, labelOrDash } = await import('./display-labels');
  // Deliveries don't carry churchId; resolve via job when present.
  const jobs = await monitoringRepo.listMessageJobs(db, {
    limit: 200,
    since,
  });
  const jobChurch = new Map(jobs.map((j) => [j.id, j.churchId]));
  const names = await churchNameById(
    db,
    [...jobChurch.values()].filter(Boolean) as string[],
  );

  return {
    windowDays: 7,
    items: rows.map((r) => {
      const churchId = jobChurch.get(r.jobId) ?? null;
      return {
        id: r.id,
        jobId: r.jobId,
        channel: r.channel,
        /** Mask middle of destination for platform UI. */
        toMasked: maskAddress(r.toAddress),
        status: r.status,
        providerRef: r.providerRef,
        error: r.error,
        churchName: churchId ? labelOrDash(names, churchId) : '—',
        sentAt: r.sentAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    }),
  };
}

function maskAddress(value: string): string {
  const v = value.trim();
  if (v.includes('@')) {
    const [user, domain] = v.split('@');
    if (!domain) return '•••';
    const u = user ?? '';
    return `${u.slice(0, 2)}•••@${domain}`;
  }
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6) return '•••';
  return `${digits.slice(0, 3)}••••${digits.slice(-3)}`;
}

/**
 * In-app notification evidence across churches (bell / announcement jobs).
 * External SMS/email copies live on the delivery queue.
 */
export async function listInAppNotifications(
  ctx: PlatformCtx,
  query: { limit?: number } = {},
) {
  try {
    assertPlatformIntegrationsRead(ctx);
  } catch {
    assertPlatformMonitoringRead(ctx);
  }
  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const [jobs, recentDeliveries] = await Promise.all([
    monitoringRepo.listMessageJobs(db, {
      channel: 'in_app',
      limit: query.limit ?? 100,
      since,
    }),
    monitoringRepo.listMessageDeliveries(db, {
      limit: 40,
      since,
    }),
  ]);
  const { churchNameById, labelOrDash } = await import('./display-labels');
  const names = await churchNameById(
    db,
    jobs.map((j) => j.churchId),
  );

  return {
    windowDays: 30,
    items: jobs.map((j) => ({
      id: j.id,
      channel: j.channel,
      status: j.status,
      title: j.title,
      /** Truncated preview — full body stays church-plane. */
      preview: j.body ? j.body.slice(0, 160) : null,
      churchName: labelOrDash(names, j.churchId),
      churchId: j.churchId,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
    })),
    recentOutbound: recentDeliveries.slice(0, 20).map((r) => ({
      id: r.id,
      channel: r.channel,
      status: r.status,
      toMasked: maskAddress(r.toAddress),
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

const DEFAULT_TEST_TEXT =
  'Ekklesia test message from the platform console. No action is needed.';

function parseAllowList(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function assertOnAllowList(
  recipient: string,
  allow: string[],
  envName: string,
) {
  if (allow.includes('*') || allow.includes(recipient)) return;
  if (allow.length === 0) {
    throw forbidden(
      `Set ${envName} (comma list or *) before sending a test.`,
    );
  }
  throw forbidden(
    `Recipient is not on ${envName}. Add it or use * in development.`,
  );
}

async function sendTestEmail(input: {
  to: string;
  text: string;
}): Promise<{ ok: true; providerRef: string } | { ok: false; error: string }> {
  const host = process.env.AUTH_SMTP_HOST?.trim();
  const user = process.env.AUTH_SMTP_USER?.trim();
  const pass = process.env.AUTH_SMTP_PASS?.trim();
  const from =
    process.env.AUTH_EMAIL_FROM?.trim() || user || 'noreply@localhost';

  if (!host || !user || !pass) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  try {
    const nodemailer = await import('nodemailer');
    const port = Number(process.env.AUTH_SMTP_PORT || '587');
    const secure =
      process.env.AUTH_SMTP_SECURE === '1' ||
      process.env.AUTH_SMTP_SECURE === 'true' ||
      port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject: 'Ekklesia platform test email',
      text: input.text,
    });
    return {
      ok: true,
      providerRef: String(info.messageId ?? `smtp:${randomUUID()}`),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'smtp_send_failed';
    return { ok: false, error: message.slice(0, 200) };
  }
}

/**
 * Send a platform test SMS (notify adapter) or email (AUTH_SMTP).
 * Requires PIN step-up and channel allow-lists.
 */
export async function sendMessagingTest(
  ctx: PlatformCtx,
  body: MessagingTestBody,
) {
  assertPlatformIntegrationsWrite(ctx);
  await confirmOperatorPin(ctx, { pin: body.pin });

  const env = getEnv();
  const text =
    body.body && body.body.length > 0 ? body.body : DEFAULT_TEST_TEXT;

  if (body.channel === 'sms') {
    assertOnAllowList(
      body.to,
      parseAllowList(env.SMS_TEST_RECIPIENTS),
      'SMS_TEST_RECIPIENTS',
    );
  } else {
    assertOnAllowList(
      body.to.toLowerCase(),
      parseAllowList(env.EMAIL_TEST_RECIPIENTS).map((e) => e.toLowerCase()),
      'EMAIL_TEST_RECIPIENTS',
    );
  }

  const result =
    body.channel === 'email'
      ? await sendTestEmail({ to: body.to, text })
      : await getNotifyAdapter().send({
          channel: 'sms',
          to: body.to,
          body: text,
          idempotencyKey: `platform-test:${randomUUID()}`,
        });

  const db = getDb();
  await writePlatformAudit(db, ctx, {
    action: 'platform.messaging.test_send',
    entityType: 'notify',
    entityId: result.ok ? result.providerRef : 'failed',
    metadata: sanitizeAuditMetadata({
      channel: body.channel,
      to: body.to,
      reason: body.reason,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
    }),
  });

  return {
    ok: result.ok,
    providerRef: result.ok ? result.providerRef : null,
    error: result.ok ? null : result.error,
  };
}
