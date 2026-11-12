import type { PlatformCtx } from '@/platform/auth';
import { getAuth } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  validationFailed,
} from '@/platform/errors';
import { PERMISSIONS } from '@/modules/access-control/permissions';
import {
  assertPlatformAdmin,
  assertPlatformImpersonate,
  assertPlatformRead,
  assertPlatformSecurityRead,
} from './policies';
import * as repo from './repository';
import { runSecurityDetectors } from './detectors';
import { DEFAULT_PLATFORM_PERMISSIONS } from './constants';
import type {
  AddOperatorBody,
  EnterTenantBody,
  GrowthQuery,
  ListFindingsQuery,
  ListPlatformAuditQuery,
  PatchFindingBody,
} from './schemas';

function daysAgoIsoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function getOverview(ctx: PlatformCtx) {
  assertPlatformRead(ctx);
  const db = getDb();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    churchesTotal,
    peopleTotal,
    membershipsActive,
    checkins7d,
    messages7d,
    findings,
    failedJobs7d,
    authFailures7d,
    recentOpen,
  ] = await Promise.all([
    repo.countChurches(db),
    repo.countPeople(db),
    repo.countActiveMemberships(db),
    repo.countAttendanceCheckinsSince(db, since7d),
    repo.countMessageDeliveriesSince(db, since7d),
    repo.countOpenFindings(db),
    repo.countFailedMessageJobsSince(db, since7d),
    repo.countAuthFailureAuditsSince(db, since7d),
    repo.recentFindings(db, 5),
  ]);

  const healthScore = Math.max(
    0,
    100 -
      findings.critical * 25 -
      Math.min(findings.open, 10) * 3 -
      Math.min(failedJobs7d, 20) * 2 -
      Math.min(authFailures7d, 30),
  );

  await writePlatformAudit(db, ctx, {
    action: 'platform.overview.read',
    entityType: 'platform',
    metadata: { healthScore },
  });

  return {
    healthScore,
    findings: {
      open: findings.open,
      critical: findings.critical,
      recent: recentOpen.map((f) => ({
        id: f.id,
        severity: f.severity,
        title: f.title,
        category: f.category,
        status: f.status,
        lastSeenAt: f.lastSeenAt.toISOString(),
      })),
    },
    growth: {
      churchesTotal,
      peopleTotal,
      membershipsActive,
      attendanceCheckins7d: checkins7d,
      messagesSent7d: messages7d,
    },
    fault: {
      failedMessageJobs7d: failedJobs7d,
      authFailures7d,
    },
  };
}

export async function listPlatformChurches(ctx: PlatformCtx) {
  assertPlatformRead(ctx);
  const db = getDb();
  const rows = await repo.listChurches(db);
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      timezone: r.timezone,
      defaultLocale: r.defaultLocale,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getPlatformChurch(ctx: PlatformCtx, churchId: string) {
  assertPlatformRead(ctx);
  const db = getDb();
  const church = await repo.getChurchById(db, churchId);
  if (!church) throw notFound();

  const counts = await repo.churchCounts(db, churchId);
  const findings = await repo.listFindings(db, {
    churchId,
    limit: 10,
    status: 'open',
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.church.read',
    entityType: 'church',
    entityId: churchId,
    churchId,
  });

  return {
    church: {
      id: church.id,
      name: church.name,
      slug: church.slug,
      timezone: church.timezone,
      defaultLocale: church.defaultLocale,
      createdAt: church.createdAt.toISOString(),
    },
    counts,
    openFindings: findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      status: f.status,
      lastSeenAt: f.lastSeenAt.toISOString(),
    })),
  };
}

export async function listPlatformAuditEvents(
  ctx: PlatformCtx,
  query: ListPlatformAuditQuery,
) {
  assertPlatformSecurityRead(ctx);
  const db = getDb();
  const items = await repo.listPlatformAudit(db, query);
  return {
    items: items.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      outcome: row.outcome,
      churchId: row.churchId,
      entityType: row.entityType,
      entityId: row.entityId,
      requestId: row.requestId,
      reason: row.reason,
      metadata: sanitizeAuditMetadata(row.metadata ?? {}),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function listSecurityFindings(
  ctx: PlatformCtx,
  query: ListFindingsQuery,
) {
  assertPlatformSecurityRead(ctx);
  const db = getDb();
  const items = await repo.listFindings(db, query);
  return {
    items: items.map((f) => ({
      id: f.id,
      severity: f.severity,
      category: f.category,
      title: f.title,
      status: f.status,
      churchId: f.churchId,
      detectorKey: f.detectorKey,
      evidence: sanitizeAuditMetadata(f.evidence ?? {}),
      firstSeenAt: f.firstSeenAt.toISOString(),
      lastSeenAt: f.lastSeenAt.toISOString(),
      resolvedAt: f.resolvedAt?.toISOString() ?? null,
    })),
  };
}

export async function patchSecurityFinding(
  ctx: PlatformCtx,
  findingId: string,
  body: PatchFindingBody,
) {
  assertPlatformSecurityRead(ctx);
  const db = getDb();
  const existing = await repo.getFindingById(db, findingId);
  if (!existing) throw notFound();

  await repo.updateFindingStatus(
    db,
    findingId,
    body.status,
    ctx.actor.userAccountId,
  );

  await writePlatformAudit(db, ctx, {
    action: 'platform.finding.update',
    entityType: 'security_finding',
    entityId: findingId,
    churchId: existing.churchId ?? undefined,
    metadata: { status: body.status },
  });

  return { id: findingId, status: body.status };
}

export async function runDetectors(ctx: PlatformCtx) {
  assertPlatformAdmin(ctx);
  const db = getDb();
  const result = await runSecurityDetectors(db);
  await writePlatformAudit(db, ctx, {
    action: 'platform.detectors.run',
    entityType: 'platform',
    metadata: result,
  });
  return result;
}

export async function getGrowth(ctx: PlatformCtx, query: GrowthQuery) {
  assertPlatformRead(ctx);
  const db = getDb();
  const since = daysAgoIsoDate(query.days);

  const live = {
    churchesTotal: await repo.countChurches(db),
    peopleTotal: await repo.countPeople(db),
    membershipsActive: await repo.countActiveMemberships(db),
    attendanceCheckins7d: await repo.countAttendanceCheckinsSince(
      db,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ),
    messagesSent7d: await repo.countMessageDeliveriesSince(
      db,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ),
  };

  const seriesKeys = [
    'churches_total',
    'people_total',
    'memberships_active',
  ] as const;
  const series: Record<string, { date: string; value: number }[]> = {};
  for (const key of seriesKeys) {
    const rows = await repo.listMetricSeries(db, key, since);
    series[key] = rows.map((r) => ({
      date: String(r.snapshotDate),
      value: r.value,
    }));
  }

  return { live, series, days: query.days };
}

export async function getHealth(ctx: PlatformCtx) {
  assertPlatformRead(ctx);
  const db = getDb();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [failedJobs, authFailures, openFindings] = await Promise.all([
    repo.countFailedMessageJobsSince(db, since24h),
    repo.countAuthFailureAuditsSince(db, since24h),
    repo.countOpenFindings(db),
  ]);

  return {
    windowHours: 24,
    failedMessageJobs: failedJobs,
    authFailures,
    openFindings: openFindings.open,
    criticalFindings: openFindings.critical,
    runbooks: [
      '/docs/runbooks/platform-security-findings.md',
      '/docs/PILOT_READINESS.md',
    ],
  };
}

export async function listOperators(ctx: PlatformCtx) {
  assertPlatformAdmin(ctx);
  const db = getDb();
  const rows = await repo.listOperators(db);
  return {
    items: rows.map((r) => ({
      id: r.id,
      userAccountId: r.userAccountId,
      email: r.email,
      status: r.status,
      permissions: r.permissions,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function addOperator(ctx: PlatformCtx, body: AddOperatorBody) {
  assertPlatformAdmin(ctx);
  const db = getDb();
  const existing = await repo.listOperators(db);
  if (existing.some((o) => o.userAccountId === body.userAccountId && o.status === 'active')) {
    throw conflict('User is already a platform operator');
  }

  const id = await repo.insertOperator(db, {
    userAccountId: body.userAccountId,
    permissions: body.permissions
      ? [...body.permissions]
      : [...DEFAULT_PLATFORM_PERMISSIONS],
    actorUserId: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.operator.add',
    entityType: 'platform_operator',
    entityId: id,
    metadata: { userAccountId: body.userAccountId },
  });

  return { id, userAccountId: body.userAccountId };
}

export async function getAccessSummary(ctx: PlatformCtx) {
  assertPlatformAdmin(ctx);
  const db = getDb();
  const summary = await repo.accessSummary(db);
  return {
    roleCounts: summary.roleCounts.map((r) => ({
      churchId: r.churchId,
      roleCode: r.roleCode,
      count: Number(r.n),
    })),
    recentPrivilege: summary.recentPrivilege.map((r) => ({
      id: r.id,
      action: r.action,
      actorUserId: r.actorUserId,
      churchId: r.churchId,
      createdAt: r.createdAt.toISOString(),
      metadata: sanitizeAuditMetadata(r.metadata ?? {}),
    })),
  };
}

/**
 * Audited support entry into a church tenant.
 * Sets Better Auth activeChurchId when a cookie session exists;
 * for x-dev sessions, returns the churchId for the client to send as x-dev-church-id.
 */
export async function enterTenant(
  ctx: PlatformCtx,
  churchId: string,
  body: EnterTenantBody,
  request: Request,
) {
  assertPlatformImpersonate(ctx);
  const db = getDb();
  const church = await repo.getChurchById(db, churchId);
  if (!church) throw notFound();

  let setCookieHeaders: string[] = [];
  const authMode = request.headers.get('x-dev-platform-operator') === '1' ? 'dev' : 'better-auth';

  if (authMode === 'better-auth') {
    try {
      const auth = getAuth();
      const ba = await auth.api.getSession({ headers: request.headers });
      if (!ba?.session?.token) {
        throw unauthorized();
      }
      const updateResponse = await auth.api.updateSession({
        body: { activeChurchId: churchId },
        headers: request.headers,
        asResponse: true,
      });
      if (!updateResponse.ok) {
        const text = await updateResponse.text();
        throw validationFailed(
          [
            {
              field: 'churchId',
              code: 'session_update_failed',
              message: text.slice(0, 200),
            },
          ],
          'Failed to pin active church on session',
        );
      }
      setCookieHeaders =
        typeof updateResponse.headers.getSetCookie === 'function'
          ? updateResponse.headers.getSetCookie()
          : [];
    } catch (err) {
      if (err instanceof Error && 'status' in err) throw err;
      throw forbidden('Unable to enter tenant session');
    }
  }

  await writePlatformAudit(db, ctx, {
    action: 'platform.tenant.enter',
    entityType: 'church',
    entityId: churchId,
    churchId,
    reason: body.reason,
    metadata: { churchName: church.name, authMode },
  });

  return {
    churchId,
    churchName: church.name,
    reason: body.reason,
    /** When using church APIs after enter, platform operators receive full permission set. */
    supportPermissionsHint: [...PERMISSIONS],
    setCookieHeaders,
    /** Dev clients should send this as x-dev-church-id after enter. */
    devHint:
      authMode === 'dev'
        ? { 'x-dev-church-id': churchId, 'x-dev-platform-operator': '1' }
        : undefined,
  };
}

export async function snapshotMetrics(ctx: PlatformCtx) {
  assertPlatformAdmin(ctx);
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const values: Record<string, number> = {
    churches_total: await repo.countChurches(db),
    people_total: await repo.countPeople(db),
    memberships_active: await repo.countActiveMemberships(db),
  };

  for (const [metricKey, value] of Object.entries(values)) {
    await repo.upsertMetricSnapshot(db, {
      snapshotDate: today,
      metricKey,
      value,
    });
  }

  await writePlatformAudit(db, ctx, {
    action: 'platform.metrics.snapshot',
    entityType: 'platform',
    metadata: values,
  });

  return { snapshotDate: today, values };
}
