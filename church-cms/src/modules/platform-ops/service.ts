import type { PlatformCtx } from '@/platform/auth';
import { hasPlatformPermission, provisionCredentialAccount } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { conflict, notFound } from '@/platform/errors';
import {
  assertPlatformAdmin,
  assertPlatformAuditRead,
  assertPlatformChurchesRead,
  assertPlatformChurchesWrite,
  assertPlatformFindingsManage,
  assertPlatformImpersonate,
  assertPlatformMetricsWrite,
  assertPlatformAccountsRead,
  assertPlatformOperatorsManage,
  assertPlatformRead,
  assertPlatformSecurityRead,
} from './policies';
import * as repo from './repository';
import { runSecurityDetectors } from './detectors';
import { DEFAULT_PLATFORM_PERMISSIONS } from './constants';
import { slugifyChurchName } from './slug';
import type {
  AddOperatorBody,
  CreateChurchBody,
  EnterTenantBody,
  GrowthQuery,
  ListFindingsQuery,
  ListPlatformAuditQuery,
  PatchFindingBody,
  PurgeAuditLogsBody,
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

  const { hasPlatformPermission } = await import('@/platform/auth');
  const showAnalytics =
    hasPlatformPermission(ctx, 'platform:analytics_read') ||
    hasPlatformPermission(ctx, 'platform:admin');
  const showConfig =
    hasPlatformPermission(ctx, 'platform:config_read') ||
    hasPlatformPermission(ctx, 'platform:config_write') ||
    hasPlatformPermission(ctx, 'platform:admin');
  const showApplications =
    hasPlatformPermission(ctx, 'platform:applications_review') ||
    hasPlatformPermission(ctx, 'platform:applications_decide') ||
    hasPlatformPermission(ctx, 'platform:admin');

  let analyticsWidgets: {
    lifecycle: Record<string, number>;
    applicationsOpen: number;
    activeSupportSessions: number;
  } | null = null;
  let configStatus: {
    globalConfigured: boolean;
    defaultsConfigured: boolean;
    tenantOverrideCount: number;
  } | null = null;
  let pendingApplications: {
    count: number;
    items: Array<{
      id: string;
      officialName: string;
      status: string;
      representativeName: string;
      email: string;
      emailVerifiedAt: string | null;
      createdAt: string;
    }>;
  } | null = null;

  if (showAnalytics) {
    const analyticsRepo = await import('./analytics-repository');
    const [lifecycle, applications, activeSupportSessions] = await Promise.all([
      analyticsRepo.countChurchesByLifecycle(db),
      analyticsRepo.countRegistrationApplicationsByStatus(db),
      analyticsRepo.countActiveSupportSessions(db),
    ]);
    const applicationsOpen =
      (applications.submitted ?? 0) +
      (applications.email_verified ?? 0) +
      (applications.under_review ?? 0);
    analyticsWidgets = { lifecycle, applicationsOpen, activeSupportSessions };
  }

  if (showConfig) {
    const configRepo = await import('./config-repository');
    configStatus = await configRepo.configLayerStatus(db);
  }

  if (showApplications) {
    const regRepo = await import('./registration-repository');
    const [count, rows] = await Promise.all([
      regRepo.countApplicationsByStatuses(db, [
        'submitted',
        'email_verified',
        'under_review',
      ]),
      regRepo.listApplicationsNeedingReview(db, 8),
    ]);
    pendingApplications = {
      count,
      items: rows.map((row) => ({
        id: row.id,
        officialName: row.officialName,
        status: row.status,
        representativeName: row.representativeName,
        email: row.email,
        emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

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
    pendingApplications,
    widgets: {
      analytics: analyticsWidgets,
      config: configStatus,
    },
  };
}

export async function listPlatformChurches(
  ctx: PlatformCtx,
  query: import('./schemas').ListChurchesQuery = { limit: 100 },
) {
  assertPlatformChurchesRead(ctx);
  const db = getDb();
  const rows = await repo.listChurches(db, query);
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      timezone: r.timezone,
      defaultLocale: r.defaultLocale,
      lifecycleStatus: r.lifecycleStatus,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Platform-only: create a church tenant and first church administrator.
 * Returns the issued PIN once — never write it to audit/logs (DEC-032).
 */
export async function createPlatformChurch(
  ctx: PlatformCtx,
  body: CreateChurchBody,
) {
  assertPlatformChurchesWrite(ctx);
  const db = getDb();
  const actorUserId = ctx.actor.userAccountId;

  const slug = body.slug?.trim() || slugifyChurchName(body.name);
  if (await repo.findChurchBySlug(db, slug)) {
    throw conflict('A church with this slug already exists.');
  }

  const email = body.admin.email.trim().toLowerCase();
  if (await repo.findUserAccountByEmail(db, email)) {
    throw conflict('An account with this admin email already exists.');
  }
  if (
    body.admin.phoneE164 &&
    (await repo.findUserAccountByPhone(db, body.admin.phoneE164))
  ) {
    throw conflict('An account with this admin phone already exists.');
  }

  const churchId = newId();
  const personId = newId();
  const userAccountId = newId();

  await repo.insertChurch(db, {
    id: churchId,
    name: body.name.trim(),
    slug,
    timezone: body.timezone,
    defaultLocale: body.defaultLocale,
    actorUserId,
  });

  const { administratorRoleId } = await repo.bootstrapChurchRoles(
    db,
    churchId,
    actorUserId,
  );

  await repo.insertChurchAdminBundle(db, {
    churchId,
    actorUserId,
    administratorRoleId,
    personId,
    userAccountId,
    displayName: body.admin.displayName.trim(),
    email,
    phoneE164: body.admin.phoneE164 ?? null,
  });

  await provisionCredentialAccount(db, {
    userAccountId,
    displayName: body.admin.displayName.trim(),
    email,
    phoneE164: body.admin.phoneE164 ?? null,
    pin: body.admin.pin,
    twoFactorEnabled: true,
  });

  await repo.insertDefaultEventTypes(db, churchId, userAccountId);

  await writePlatformAudit(db, ctx, {
    action: 'platform.church.created',
    entityType: 'church',
    entityId: churchId,
    churchId,
    metadata: sanitizeAuditMetadata({
      slug,
      adminUserAccountId: userAccountId,
      adminEmail: email,
      // pin intentionally omitted
    }),
  });

  return {
    church: {
      id: churchId,
      name: body.name.trim(),
      slug,
      timezone: body.timezone,
      defaultLocale: body.defaultLocale,
    },
    admin: {
      userAccountId,
      personId,
      displayName: body.admin.displayName.trim(),
      email,
      phoneE164: body.admin.phoneE164 ?? null,
      /** Shown once to the platform operator — not stored in audit. */
      initialPin: body.admin.pin,
      mfaRequired: true,
    },
  };
}

export async function getPlatformChurch(ctx: PlatformCtx, churchId: string) {
  assertPlatformChurchesRead(ctx);
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

  const recentAudit = await repo.listPlatformAudit(db, {
    churchId,
    limit: 15,
  });
  const { emailByUserAccountId, labelOrDash } = await import('./display-labels');
  const actorEmails = await emailByUserAccountId(
    db,
    recentAudit.map((r) => r.actorUserId),
  );

  let accounts: Array<{
    userAccountId: string;
    displayName: string | null;
    email: string | null;
    phoneE164: string | null;
    accountStatus: string;
    orgLinkStatus: string;
  }> = [];
  if (
    hasPlatformPermission(ctx, 'platform:accounts_read') ||
    hasPlatformPermission(ctx, 'platform:admin')
  ) {
    const accountsRepo = await import('./accounts-repository');
    const rows = await accountsRepo.listTenantAccounts(db, churchId, {
      limit: 50,
    });
    accounts = rows.map((a) => ({
      userAccountId: a.userAccountId,
      displayName: a.displayName,
      email: a.email,
      phoneE164: a.phoneE164,
      accountStatus: a.accountStatus,
      orgLinkStatus: a.orgStatus,
    }));
  }

  return {
    church: {
      id: church.id,
      name: church.name,
      slug: church.slug,
      timezone: church.timezone,
      defaultLocale: church.defaultLocale,
      lifecycleStatus: church.lifecycleStatus,
      createdAt: church.createdAt.toISOString(),
    },
    counts,
    accounts,
    openFindings: findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      status: f.status,
      lastSeenAt: f.lastSeenAt.toISOString(),
    })),
    recentAudit: recentAudit.map((row) => ({
      id: row.id,
      action: row.action,
      outcome: row.outcome,
      actorEmail: labelOrDash(actorEmails, row.actorUserId),
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

function auditHref(input: {
  scope: 'platform' | 'tenant';
  entityType: string;
  entityId: string | null;
  churchId: string | null;
}): string | null {
  if (input.entityType === 'church' && input.entityId) {
    return `/platform/churches/${input.entityId}`;
  }
  if (
    (input.entityType === 'operator' ||
      input.entityType === 'platform_operator') &&
    input.entityId
  ) {
    return `/platform/access/operators/${input.entityId}`;
  }
  if (input.churchId) {
    return `/platform/churches/${input.churchId}`;
  }
  return null;
}

export async function listPlatformAuditEvents(
  ctx: PlatformCtx,
  query: ListPlatformAuditQuery,
) {
  assertPlatformAuditRead(ctx);
  const db = getDb();
  const scope = query.scope ?? 'platform';
  const items =
    scope === 'tenant'
      ? await repo.listTenantAudit(db, query)
      : await repo.listPlatformAudit(db, query);
  const entityTypes = await repo.listDistinctAuditEntityTypes(db, scope);
  const { churchNameById, emailByUserAccountId, labelOrDash } = await import(
    './display-labels'
  );
  const churchNames = await churchNameById(
    db,
    items.map((r) => r.churchId),
  );
  const actorEmails = await emailByUserAccountId(
    db,
    items.map((r) => r.actorUserId),
  );

  const churchRows = await repo.listChurches(db, { limit: 100 });
  const churches = churchRows.map((c) => ({ id: c.id, name: c.name }));

  return {
    scope,
    entityTypes,
    churches,
    items: items.map((row) => {
      const outcome =
        'outcome' in row && typeof row.outcome === 'string'
          ? row.outcome
          : 'success';
      const requestId =
        'requestId' in row && typeof row.requestId === 'string'
          ? row.requestId
          : null;
      const reason =
        'reason' in row && typeof row.reason === 'string' ? row.reason : null;
      return {
        id: row.id,
        scope,
        action: row.action,
        outcome,
        actorUserId: row.actorUserId,
        actorEmail: labelOrDash(actorEmails, row.actorUserId),
        churchId: row.churchId,
        churchName: labelOrDash(churchNames, row.churchId),
        entityType: row.entityType,
        entityId: row.entityId,
        requestId,
        reason,
        href: `/platform/audit/${row.id}?scope=${scope}`,
        relatedHref: auditHref({
          scope,
          entityType: row.entityType,
          entityId: row.entityId,
          churchId: row.churchId,
        }),
        createdAt: row.createdAt.toISOString(),
      };
    }),
  };
}

export async function getPlatformAuditEvent(
  ctx: PlatformCtx,
  id: string,
  scope: 'platform' | 'tenant' = 'platform',
) {
  assertPlatformAuditRead(ctx);
  const db = getDb();
  const row =
    scope === 'tenant'
      ? await repo.getTenantAuditById(db, id)
      : await repo.getPlatformAuditById(db, id);
  if (!row) throw notFound();

  const { churchNameById, emailByUserAccountId, labelOrDash } = await import(
    './display-labels'
  );
  const [churchNames, actorEmails] = await Promise.all([
    churchNameById(db, [row.churchId]),
    emailByUserAccountId(db, [row.actorUserId]),
  ]);

  const related =
    scope === 'platform' &&
    'requestId' in row &&
    typeof row.requestId === 'string' &&
    row.requestId
      ? await repo.listPlatformAuditByRequestId(db, row.requestId)
      : [];

  const outcome =
    'outcome' in row && typeof row.outcome === 'string' ? row.outcome : 'success';
  const requestId =
    'requestId' in row && typeof row.requestId === 'string'
      ? row.requestId
      : null;
  const reason =
    'reason' in row && typeof row.reason === 'string' ? row.reason : null;

  return {
    scope,
    event: {
      id: row.id,
      action: row.action,
      outcome,
      actorUserId: row.actorUserId,
      actorEmail: labelOrDash(actorEmails, row.actorUserId),
      churchId: row.churchId,
      churchName: labelOrDash(churchNames, row.churchId),
      entityType: row.entityType,
      entityId: row.entityId,
      requestId,
      reason,
      metadata: sanitizeAuditMetadata(
        (row.metadata as Record<string, unknown> | null) ?? {},
      ),
      relatedHref: auditHref({
        scope,
        entityType: row.entityType,
        entityId: row.entityId,
        churchId: row.churchId,
      }),
      createdAt: row.createdAt.toISOString(),
    },
    related: related
      .filter((r) => r.id !== id)
      .map((r) => ({
        id: r.id,
        action: r.action,
        outcome: r.outcome,
        entityType: r.entityType,
        href: `/platform/audit/${r.id}?scope=platform`,
        createdAt: r.createdAt.toISOString(),
      })),
  };
}

/**
 * Permanently delete audit rows. platform:admin + PIN + typed DELETE.
 * Writes one fresh platform attestation after the wipe (so the purge itself is recorded).
 */
export async function purgeAuditLogs(ctx: PlatformCtx, body: PurgeAuditLogsBody) {
  assertPlatformAdmin(ctx);
  const { confirmOperatorPin } = await import('./reauth-service');
  await confirmOperatorPin(ctx, { pin: body.pin });

  const db = getDb();
  const before = body.before ? new Date(body.before) : undefined;
  const wipePlatform =
    body.scope === 'platform' || body.scope === 'all';
  const wipeTenant = body.scope === 'tenant' || body.scope === 'all';

  const [platformCount, tenantCount] = await Promise.all([
    wipePlatform ? repo.countPlatformAudit(db, before) : Promise.resolve(0),
    wipeTenant ? repo.countTenantAudit(db, before) : Promise.resolve(0),
  ]);

  const deletedPlatform = wipePlatform
    ? await repo.deletePlatformAudit(db, before)
    : 0;
  const deletedTenant = wipeTenant
    ? await repo.deleteTenantAudit(db, before)
    : 0;

  await writePlatformAudit(db, ctx, {
    action: 'platform.audit.purged',
    entityType: 'audit',
    reason: body.reason,
    metadata: sanitizeAuditMetadata({
      scope: body.scope,
      before: body.before ?? null,
      deletedPlatform,
      deletedTenant,
      countedPlatform: platformCount,
      countedTenant: tenantCount,
    }),
  });

  return {
    scope: body.scope,
    before: body.before ?? null,
    deletedPlatform,
    deletedTenant,
    deletedTotal: deletedPlatform + deletedTenant,
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
  assertPlatformFindingsManage(ctx);
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
  assertPlatformFindingsManage(ctx);
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
  assertPlatformOperatorsManage(ctx);
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
  assertPlatformOperatorsManage(ctx);
  const db = getDb();
  const email = body.email.trim().toLowerCase();
  const account = await repo.findUserAccountByEmail(db, email);
  if (!account) {
    throw notFound('No user account found for that email.');
  }

  const existing = await repo.listOperators(db);
  if (existing.some((o) => o.userAccountId === account.id && o.status === 'active')) {
    throw conflict('User is already a platform operator');
  }

  const id = await repo.insertOperator(db, {
    userAccountId: account.id,
    permissions: body.permissions
      ? [...body.permissions]
      : [...DEFAULT_PLATFORM_PERMISSIONS],
    actorUserId: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.operator.add',
    entityType: 'platform_operator',
    entityId: id,
    metadata: sanitizeAuditMetadata({ email }),
  });

  return { id, email };
}

export async function getAccessSummary(ctx: PlatformCtx) {
  try {
    assertPlatformOperatorsManage(ctx);
  } catch {
    assertPlatformAccountsRead(ctx);
  }
  const db = getDb();
  const summary = await repo.accessSummary(db);
  const { churchNameById, emailByUserAccountId, labelOrDash } = await import(
    './display-labels'
  );
  const churchNames = await churchNameById(db, [
    ...summary.roleCounts.map((r) => r.churchId),
    ...summary.recentPrivilege.map((r) => r.churchId),
  ]);
  const actorEmails = await emailByUserAccountId(
    db,
    summary.recentPrivilege.map((r) => r.actorUserId),
  );
  return {
    roleCounts: summary.roleCounts.map((r) => ({
      churchName: labelOrDash(churchNames, r.churchId),
      roleCode: r.roleCode,
      count: Number(r.n),
    })),
    recentPrivilege: summary.recentPrivilege.map((r) => ({
      id: r.id,
      action: r.action,
      actorEmail: labelOrDash(actorEmails, r.actorUserId),
      churchName: labelOrDash(churchNames, r.churchId),
      createdAt: r.createdAt.toISOString(),
      metadata: sanitizeAuditMetadata(r.metadata ?? {}),
    })),
  };
}

/**
 * Audited support entry into a church tenant (Phase 6: creates controlled session).
 * Sets Better Auth activeChurchId when a cookie session exists;
 * for x-dev sessions, returns the churchId for the client to send as x-dev-church-id.
 */
export async function enterTenant(
  ctx: PlatformCtx,
  churchId: string,
  body: EnterTenantBody,
  request: Request,
) {
  const { enterTenantWithSupport } = await import('./support-service');
  return enterTenantWithSupport(ctx, churchId, body, request);
}

export async function snapshotMetrics(ctx: PlatformCtx) {
  assertPlatformMetricsWrite(ctx);
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
