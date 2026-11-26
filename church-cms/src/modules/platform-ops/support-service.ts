import type { PlatformCtx } from '@/platform/auth';
import { getAuth } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  validationFailed,
} from '@/platform/errors';
import {
  assertPlatformAccessReviews,
  assertPlatformBreakGlass,
  assertPlatformImpersonate,
  assertPlatformSupportCases,
} from './policies';
import * as churchRepo from './repository';
import * as supportRepo from './support-repository';
import { loadResolvedGlobalConfig } from './runtime-config';
import {
  churchPermissionsForSupportAccess,
  type SupportAccessLevel,
} from './support-access';
import type {
  CreateSupportCaseBody,
  EnterTenantSupportBody,
  ListSupportCasesQuery,
  ListSupportSessionsQuery,
  PatchSupportCaseBody,
  RevokeSupportSessionBody,
  StartSupportSessionBody,
} from './support-schemas';
import type {
  CompleteAccessReviewBody,
  CreateAccessReviewBody,
  CreateBreakGlassBody,
  RevokeBreakGlassBody,
} from './security-depth-schemas';

function mapCase(
  row: Awaited<ReturnType<typeof supportRepo.getSupportCaseById>>,
  churchName?: string | null,
) {
  if (!row) return null;
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    severity: row.severity,
    churchName: churchName ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createSupportCase(
  ctx: PlatformCtx,
  body: CreateSupportCaseBody,
) {
  assertPlatformSupportCases(ctx);
  const db = getDb();
  if (body.churchId) {
    const church = await churchRepo.getChurchById(db, body.churchId);
    if (!church) throw notFound('Church not found.');
  }
  const id = newId();
  const caseNumber = await supportRepo.nextCaseNumber(db);
  await supportRepo.insertSupportCase(db, {
    id,
    caseNumber,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    priority: body.priority,
    severity: body.severity,
    churchId: body.churchId ?? null,
    reporterUserId: ctx.actor.userAccountId,
  });
  await writePlatformAudit(db, ctx, {
    action: 'platform.support_case.create',
    entityType: 'platform_support_case',
    entityId: id,
    churchId: body.churchId,
    metadata: { caseNumber, priority: body.priority, severity: body.severity },
  });
  const created = await supportRepo.getSupportCaseById(db, id);
  let churchName: string | null = null;
  if (created?.churchId) {
    const church = await churchRepo.getChurchById(db, created.churchId);
    churchName = church?.name ?? null;
  }
  return mapCase(created, churchName)!;
}

export async function listSupportCases(
  ctx: PlatformCtx,
  query: ListSupportCasesQuery,
) {
  assertPlatformSupportCases(ctx);
  const db = getDb();
  const rows = await supportRepo.listSupportCases(db, query);
  const { churchNameById, labelOrDash } = await import('./display-labels');
  const names = await churchNameById(
    db,
    rows.map((r) => r.churchId),
  );
  return {
    items: rows.map((r) => mapCase(r, labelOrDash(names, r.churchId))!),
  };
}

export async function getSupportCase(ctx: PlatformCtx, caseId: string) {
  assertPlatformSupportCases(ctx);
  const db = getDb();
  const row = await supportRepo.getSupportCaseById(db, caseId);
  if (!row) throw notFound();
  let churchName: string | null = null;
  if (row.churchId) {
    const church = await churchRepo.getChurchById(db, row.churchId);
    churchName = church?.name ?? null;
  }
  return mapCase(row, churchName)!;
}

export async function patchSupportCase(
  ctx: PlatformCtx,
  caseId: string,
  body: PatchSupportCaseBody,
) {
  assertPlatformSupportCases(ctx);
  const db = getDb();
  const existing = await supportRepo.getSupportCaseById(db, caseId);
  if (!existing) throw notFound();

  const resolvedAt =
    body.status === 'resolved' || body.status === 'closed'
      ? existing.resolvedAt ?? new Date()
      : body.status
        ? null
        : undefined;

  await supportRepo.updateSupportCase(db, caseId, {
    ...(body.title !== undefined ? { title: body.title.trim() } : {}),
    ...(body.description !== undefined
      ? { description: body.description?.trim() || null }
      : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.priority !== undefined ? { priority: body.priority } : {}),
    ...(body.severity !== undefined ? { severity: body.severity } : {}),
    ...(body.assignedOperatorUserId !== undefined
      ? { assignedOperatorUserId: body.assignedOperatorUserId }
      : {}),
    ...(body.churchId !== undefined ? { churchId: body.churchId } : {}),
    ...(resolvedAt !== undefined ? { resolvedAt } : {}),
    updatedBy: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.support_case.patch',
    entityType: 'platform_support_case',
    entityId: caseId,
    metadata: sanitizeAuditMetadata({ ...body }),
  });
  const patched = await supportRepo.getSupportCaseById(db, caseId);
  let churchName: string | null = null;
  if (patched?.churchId) {
    const church = await churchRepo.getChurchById(db, patched.churchId);
    churchName = church?.name ?? null;
  }
  return mapCase(patched, churchName)!;
}

function clampSupportSession(
  body: { accessLevel: 'read' | 'interactive'; expiresInMinutes: number },
  globalCfg: Awaited<ReturnType<typeof loadResolvedGlobalConfig>>,
): { accessLevel: SupportAccessLevel; expiresInMinutes: number } {
  const maxMinutes = globalCfg.security.supportSessionMaxHours * 60;
  const expiresInMinutes = Math.min(
    Math.max(5, body.expiresInMinutes),
    maxMinutes,
  );
  // Never upgrade read → interactive from settings; interactive must be explicit.
  const accessLevel: SupportAccessLevel =
    body.accessLevel === 'interactive' ? 'interactive' : 'read';
  return { accessLevel, expiresInMinutes };
}

export async function startSupportSession(
  ctx: PlatformCtx,
  body: StartSupportSessionBody,
) {
  assertPlatformImpersonate(ctx);
  assertPlatformSupportCases(ctx);
  const db = getDb();
  await supportRepo.expireDueSupportSessions(db);

  const church = await churchRepo.getChurchById(db, body.churchId);
  if (!church) throw notFound('Church not found.');

  if (body.caseId) {
    const supportCase = await supportRepo.getSupportCaseById(db, body.caseId);
    if (!supportCase) throw notFound('Support case not found.');
  }

  const globalCfg = await loadResolvedGlobalConfig(db);
  const clamped = clampSupportSession(body, globalCfg);

  const id = newId();
  const expiresAt = new Date(
    Date.now() + clamped.expiresInMinutes * 60 * 1000,
  );
  await supportRepo.insertSupportSession(db, {
    id,
    caseId: body.caseId ?? null,
    churchId: body.churchId,
    operatorUserId: ctx.actor.userAccountId,
    purpose: body.purpose.trim(),
    accessLevel: clamped.accessLevel,
    expiresAt,
    approvedByUserId: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.support_session.start',
    entityType: 'platform_support_session',
    entityId: id,
    churchId: body.churchId,
    reason: body.purpose,
    metadata: sanitizeAuditMetadata({
      caseId: body.caseId,
      accessLevel: clamped.accessLevel,
      expiresAt: expiresAt.toISOString(),
    }),
  });

  return {
    id,
    churchId: body.churchId,
    churchName: church.name,
    accessLevel: clamped.accessLevel,
    expiresAt: expiresAt.toISOString(),
    caseId: body.caseId ?? null,
    defaultPosture:
      clamped.accessLevel === 'read'
        ? 'Prefer diagnostics and sanitised data; interactive access is exceptional.'
        : 'Interactive support access — keep scope minimal and revoke promptly.',
  };
}

export async function listSupportSessions(
  ctx: PlatformCtx,
  query: ListSupportSessionsQuery,
) {
  assertPlatformSupportCases(ctx);
  const db = getDb();
  await supportRepo.expireDueSupportSessions(db);
  const rows = await supportRepo.listSupportSessions(db, query);
  const { churchNameById, labelOrDash } = await import('./display-labels');
  const names = await churchNameById(
    db,
    rows.map((r) => r.churchId),
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      caseNumber: null as string | null,
      churchName: labelOrDash(names, r.churchId),
      purpose: r.purpose,
      accessLevel: r.accessLevel,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
      revokeReason: r.revokeReason,
    })),
  };
}

export async function revokeSupportSession(
  ctx: PlatformCtx,
  sessionId: string,
  body: RevokeSupportSessionBody,
) {
  assertPlatformSupportCases(ctx);
  const db = getDb();
  const session = await supportRepo.getSupportSessionById(db, sessionId);
  if (!session) throw notFound();
  if (session.status !== 'active') {
    throw conflict('Session is not active.');
  }
  await supportRepo.revokeSupportSession(
    db,
    sessionId,
    body.reason.trim(),
    ctx.actor.userAccountId,
  );
  await writePlatformAudit(db, ctx, {
    action: 'platform.support_session.revoke',
    entityType: 'platform_support_session',
    entityId: sessionId,
    churchId: session.churchId,
    reason: body.reason,
  });
  return { id: sessionId, status: 'revoked' as const };
}

/**
 * Enter tenant with controlled support session record (case optional).
 * Default access level is read; interactive is exceptional.
 */
export async function enterTenantWithSupport(
  ctx: PlatformCtx,
  churchId: string,
  body: EnterTenantSupportBody,
  request: Request,
) {
  assertPlatformImpersonate(ctx);
  const db = getDb();
  await supportRepo.expireDueSupportSessions(db);

  const church = await churchRepo.getChurchById(db, churchId);
  if (!church) throw notFound();

  if (body.caseId) {
    const supportCase = await supportRepo.getSupportCaseById(db, body.caseId);
    if (!supportCase) throw notFound('Support case not found.');
    assertPlatformSupportCases(ctx);
  }

  const globalCfg = await loadResolvedGlobalConfig(db);
  const clamped = clampSupportSession(body, globalCfg);

  const sessionId = newId();
  const expiresAt = new Date(
    Date.now() + clamped.expiresInMinutes * 60 * 1000,
  );
  await supportRepo.insertSupportSession(db, {
    id: sessionId,
    caseId: body.caseId ?? null,
    churchId,
    operatorUserId: ctx.actor.userAccountId,
    purpose: body.reason.trim(),
    accessLevel: clamped.accessLevel,
    expiresAt,
    approvedByUserId: ctx.actor.userAccountId,
  });

  let setCookieHeaders: string[] = [];
  const authMode =
    request.headers.get('x-dev-platform-operator') === '1' ? 'dev' : 'better-auth';

  if (authMode === 'better-auth') {
    try {
      const auth = getAuth();
      const ba = await auth.api.getSession({ headers: request.headers });
      if (!ba?.session?.token) throw unauthorized();
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
    metadata: sanitizeAuditMetadata({
      churchName: church.name,
      authMode,
      supportSessionId: sessionId,
      caseId: body.caseId,
      accessLevel: clamped.accessLevel,
      expiresAt: expiresAt.toISOString(),
    }),
  });

  const supportPerms = churchPermissionsForSupportAccess(clamped.accessLevel);

  return {
    churchId,
    churchName: church.name,
    reason: body.reason,
    supportSessionId: sessionId,
    accessLevel: clamped.accessLevel,
    expiresAt: expiresAt.toISOString(),
    supportPermissionsHint: [...supportPerms],
    setCookieHeaders,
    defaultPosture:
      clamped.accessLevel === 'read'
        ? 'Read-oriented support posture — prefer diagnostics over mutation.'
        : 'Interactive support — revoke when finished.',
    devHint:
      authMode === 'dev'
        ? {
            'x-dev-church-id': churchId,
            'x-dev-platform-operator': '1',
            'x-dev-support-access-level': clamped.accessLevel,
          }
        : undefined,
  };
}

export async function createAccessReview(
  ctx: PlatformCtx,
  body: CreateAccessReviewBody,
) {
  assertPlatformAccessReviews(ctx);
  const db = getDb();
  let snapshot: Record<string, unknown> = {};

  if (body.scope === 'platform_operators') {
    const ops = await churchRepo.listOperators(db);
    snapshot = {
      operators: ops.map((o) => ({
        id: o.id,
        userAccountId: o.userAccountId,
        email: o.email,
        status: o.status,
        permissions: o.permissions,
      })),
    };
  } else if (body.scope === 'break_glass') {
    const grants = await supportRepo.listBreakGlassGrants(db, 100);
    snapshot = {
      grants: grants.map((g) => ({
        id: g.id,
        operatorUserId: g.operatorUserId,
        status: g.status,
        permissions: g.permissions,
        expiresAt: g.expiresAt.toISOString(),
      })),
    };
  } else if (body.scope === 'support_sessions') {
    await supportRepo.expireDueSupportSessions(db);
    const sessions = await supportRepo.listSupportSessions(db, {
      status: 'active',
      limit: 100,
    });
    snapshot = {
      sessions: sessions.map((s) => ({
        id: s.id,
        churchId: s.churchId,
        operatorUserId: s.operatorUserId,
        accessLevel: s.accessLevel,
        expiresAt: s.expiresAt.toISOString(),
      })),
    };
  } else {
    snapshot = { note: 'Service account inventory reviewed via Accounts module.' };
  }

  const id = newId();
  await supportRepo.insertAccessReview(db, {
    id,
    title: body.title.trim(),
    scope: body.scope,
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
    reviewerUserId: ctx.actor.userAccountId,
    snapshot,
  });
  await writePlatformAudit(db, ctx, {
    action: 'platform.access_review.create',
    entityType: 'platform_access_review',
    entityId: id,
    metadata: { scope: body.scope },
  });
  return getAccessReview(ctx, id);
}

export async function listAccessReviews(ctx: PlatformCtx) {
  assertPlatformAccessReviews(ctx);
  const db = getDb();
  const rows = await supportRepo.listAccessReviews(db, 50);
  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      scope: r.scope,
      status: r.status,
      dueAt: r.dueAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      reviewerUserId: r.reviewerUserId,
      findingsSummary: r.findingsSummary,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getAccessReview(ctx: PlatformCtx, reviewId: string) {
  assertPlatformAccessReviews(ctx);
  const db = getDb();
  const row = await supportRepo.getAccessReviewById(db, reviewId);
  if (!row) throw notFound();
  return {
    id: row.id,
    title: row.title,
    scope: row.scope,
    status: row.status,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    reviewerUserId: row.reviewerUserId,
    findingsSummary: row.findingsSummary,
    snapshot: row.snapshot,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function completeAccessReview(
  ctx: PlatformCtx,
  reviewId: string,
  body: CompleteAccessReviewBody,
) {
  assertPlatformAccessReviews(ctx);
  const db = getDb();
  const row = await supportRepo.getAccessReviewById(db, reviewId);
  if (!row) throw notFound();
  if (row.status === 'completed') throw conflict('Review already completed.');
  await supportRepo.completeAccessReview(
    db,
    reviewId,
    body.findingsSummary.trim(),
    ctx.actor.userAccountId,
  );
  await writePlatformAudit(db, ctx, {
    action: 'platform.access_review.complete',
    entityType: 'platform_access_review',
    entityId: reviewId,
  });
  return getAccessReview(ctx, reviewId);
}

export async function createBreakGlassGrant(
  ctx: PlatformCtx,
  body: CreateBreakGlassBody,
) {
  assertPlatformBreakGlass(ctx);
  const { confirmOperatorPin } = await import('./reauth-service');
  await confirmOperatorPin(ctx, { pin: body.pin });
  const db = getDb();
  const globalCfg = await loadResolvedGlobalConfig(db);
  if (!globalCfg.featureFlags.breakGlassEnabled) {
    throw forbidden('Break-glass grants are disabled in Platform settings.');
  }

  const email = body.operatorEmail.trim().toLowerCase();
  const account = await churchRepo.findUserAccountByEmail(db, email);
  if (!account) throw notFound('No user account found for that email.');

  const ops = await churchRepo.listOperators(db);
  const isOperator = ops.some(
    (o) => o.userAccountId === account.id && o.status === 'active',
  );
  if (!isOperator) {
    throw notFound('That email is not an active platform operator.');
  }

  if (account.id === ctx.actor.userAccountId) {
    if (!ctx.platformPermissions.has('platform:admin')) {
      throw forbidden('Self break-glass requires platform:admin.');
    }
  }

  const id = newId();
  const expiresAt = new Date(
    Date.now() + body.expiresInMinutes * 60 * 1000,
  );
  await supportRepo.insertBreakGlassGrant(db, {
    id,
    operatorUserId: account.id,
    reason: body.reason.trim(),
    permissions: [...body.permissions],
    expiresAt,
    approvedByUserId: ctx.actor.userAccountId,
  });
  await writePlatformAudit(db, ctx, {
    action: 'platform.break_glass.create',
    entityType: 'platform_break_glass_grant',
    entityId: id,
    reason: body.reason,
    metadata: sanitizeAuditMetadata({
      operatorEmail: email,
      permissions: body.permissions,
      expiresAt: expiresAt.toISOString(),
    }),
  });
  return {
    id,
    operatorEmail: email,
    permissions: body.permissions,
    expiresAt: expiresAt.toISOString(),
    status: 'active' as const,
  };
}

export async function listBreakGlassGrants(ctx: PlatformCtx) {
  assertPlatformBreakGlass(ctx);
  const db = getDb();
  const rows = await supportRepo.listBreakGlassGrants(db, 50);
  const { emailByUserAccountId, labelOrDash } = await import('./display-labels');
  const emails = await emailByUserAccountId(
    db,
    rows.map((r) => r.operatorUserId),
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      operatorEmail: labelOrDash(emails, r.operatorUserId),
      reason: r.reason,
      permissions: r.permissions,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
    })),
  };
}

export async function revokeBreakGlassGrant(
  ctx: PlatformCtx,
  grantId: string,
  body: RevokeBreakGlassBody,
) {
  assertPlatformBreakGlass(ctx);
  const db = getDb();
  const row = await supportRepo.getBreakGlassById(db, grantId);
  if (!row) throw notFound();
  if (row.status !== 'active') throw conflict('Grant is not active.');
  await supportRepo.revokeBreakGlass(
    db,
    grantId,
    body.reason.trim(),
    ctx.actor.userAccountId,
  );
  await writePlatformAudit(db, ctx, {
    action: 'platform.break_glass.revoke',
    entityType: 'platform_break_glass_grant',
    entityId: grantId,
    reason: body.reason,
  });
  return { id: grantId, status: 'revoked' as const };
}
