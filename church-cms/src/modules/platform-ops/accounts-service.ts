import { createHash, randomBytes } from 'node:crypto';

import type { PlatformCtx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { conflict, notFound } from '@/platform/errors';
import {
  assertPlatformAccountsRead,
  assertPlatformAccountsWrite,
  assertPlatformOperatorsManage,
  assertPlatformServiceAccounts,
} from './policies';
import * as churchRepo from './repository';
import * as accountsRepo from './accounts-repository';
import type {
  CreateServiceAccountBody,
  ListSessionsQuery,
  ListTenantAccountsQuery,
  PatchOperatorBody,
  PatchTenantAccountBody,
  RevokeServiceAccountBody,
  RotateServiceAccountBody,
} from './accounts-schemas';

function hashCredential(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

function newServiceSecret(): { secret: string; prefix: string; hash: string } {
  const secret = `eks_${randomBytes(24).toString('base64url')}`;
  return {
    secret,
    prefix: secret.slice(0, 10),
    hash: hashCredential(secret),
  };
}

async function operatorSecurityBundle(
  db: ReturnType<typeof getDb>,
  userAccountId: string,
) {
  const [auth, activeSessions] = await Promise.all([
    accountsRepo.getAuthUserSecurity(db, userAccountId),
    accountsRepo.countSessionsForUser(db, userAccountId),
  ]);
  return {
    mfaEnabled: Boolean(auth?.twoFactorEnabled),
    authLinked: Boolean(auth),
    activeSessionCount: activeSessions,
  };
}

/** Enriched operator list (MFA + session counts). */
export async function listOperatorsDetailed(ctx: PlatformCtx) {
  assertPlatformOperatorsManage(ctx);
  const db = getDb();
  const rows = await churchRepo.listOperators(db);
  const items = await Promise.all(
    rows.map(async (r) => {
      const security = await operatorSecurityBundle(db, r.userAccountId);
      return {
        id: r.id,
        userAccountId: r.userAccountId,
        email: r.email,
        status: r.status,
        permissions: r.permissions,
        createdAt: r.createdAt.toISOString(),
        ...security,
      };
    }),
  );

  await writePlatformAudit(db, ctx, {
    action: 'platform.operators.list',
    entityType: 'platform_operator',
    metadata: { count: items.length },
  });

  return { items };
}

export async function getOperator(ctx: PlatformCtx, operatorId: string) {
  assertPlatformOperatorsManage(ctx);
  const db = getDb();
  const op = await accountsRepo.getOperatorById(db, operatorId);
  if (!op) throw notFound();
  const security = await operatorSecurityBundle(db, op.userAccountId);
  return {
    id: op.id,
    userAccountId: op.userAccountId,
    email: op.email,
    phoneE164: op.phoneE164,
    status: op.status,
    accountStatus: op.accountStatus,
    permissions: op.permissions,
    createdAt: op.createdAt.toISOString(),
    updatedAt: op.updatedAt.toISOString(),
    ...security,
  };
}

export async function patchOperator(
  ctx: PlatformCtx,
  operatorId: string,
  body: PatchOperatorBody,
) {
  assertPlatformOperatorsManage(ctx);
  const db = getDb();
  const op = await accountsRepo.getOperatorById(db, operatorId);
  if (!op) throw notFound();

  const nextStatus = body.status ?? op.status;
  const nextPerms = body.permissions
    ? [...body.permissions]
    : [...(op.permissions ?? [])];

  const wasPrivileged =
    op.status === 'active' &&
    ((op.permissions ?? []).includes('platform:admin') ||
      (op.permissions ?? []).includes('platform:operators_manage'));
  const willBePrivileged =
    nextStatus === 'active' &&
    (nextPerms.includes('platform:admin') ||
      nextPerms.includes('platform:operators_manage'));

  if (wasPrivileged && !willBePrivileged) {
    const others = await accountsRepo.countActivePlatformAdmins(db, operatorId);
    if (others < 1) {
      throw conflict(
        'Cannot remove the last active privileged platform operator.',
      );
    }
  }

  await accountsRepo.updateOperator(db, operatorId, {
    status: body.status,
    permissions: body.permissions ? nextPerms : undefined,
    updatedBy: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.operator.patch',
    entityType: 'platform_operator',
    entityId: operatorId,
    metadata: sanitizeAuditMetadata({
      reason: body.reason,
      status: body.status,
      permissions: body.permissions,
    }),
  });

  return getOperator(ctx, operatorId);
}

export async function revokeOperatorSessions(
  ctx: PlatformCtx,
  operatorId: string,
) {
  assertPlatformAccountsWrite(ctx);
  const db = getDb();
  const op = await accountsRepo.getOperatorById(db, operatorId);
  if (!op) throw notFound();

  const revoked = await accountsRepo.revokeSessionsForUser(
    db,
    op.userAccountId,
  );
  await writePlatformAudit(db, ctx, {
    action: 'platform.operator.sessions.revoke',
    entityType: 'platform_operator',
    entityId: operatorId,
    metadata: { userAccountId: op.userAccountId, revoked },
  });
  return { userAccountId: op.userAccountId, revoked };
}

export async function listAccountSessions(
  ctx: PlatformCtx,
  query: ListSessionsQuery,
) {
  assertPlatformAccountsRead(ctx);
  const db = getDb();
  const rows = await accountsRepo.listSessions(db, query);
  await writePlatformAudit(db, ctx, {
    action: 'platform.sessions.list',
    entityType: 'session',
    metadata: {
      userAccountId: query.userAccountId ?? null,
      count: rows.length,
    },
  });
  const { churchNameById, labelOrDash } = await import('./display-labels');
  const churchNames = await churchNameById(
    db,
    rows.map((r) => r.activeChurchId),
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      activeChurchName: labelOrDash(churchNames, r.activeChurchId),
      // token / ids intentionally omitted from UI payloads
    })),
    mfaRecoveryNote:
      'MFA recovery is not automated in Platform Admin. Use a controlled out-of-band procedure; never silently disable MFA.',
  };
}

export async function listTenantTechnicalAccounts(
  ctx: PlatformCtx,
  churchId: string,
  query: ListTenantAccountsQuery,
) {
  assertPlatformAccountsRead(ctx);
  const db = getDb();
  const church = await churchRepo.getChurchById(db, churchId);
  if (!church) throw notFound();

  const rows = await accountsRepo.listTenantAccounts(db, churchId, query);
  const items = await Promise.all(
    rows.map(async (r) => {
      const security = await operatorSecurityBundle(db, r.userAccountId);
      return {
        organisationUserId: r.organisationUserId,
        userAccountId: r.userAccountId,
        displayName: r.displayName,
        email: r.email,
        phoneE164: r.phoneE164,
        accountStatus: r.accountStatus,
        orgLinkStatus: r.orgStatus,
        personId: r.personId,
        createdAt: r.createdAt.toISOString(),
        ...security,
      };
    }),
  );

  await writePlatformAudit(db, ctx, {
    action: 'platform.tenant_accounts.list',
    entityType: 'church',
    entityId: churchId,
    churchId,
    metadata: { count: items.length },
  });

  return {
    church: {
      id: church.id,
      name: church.name,
      slug: church.slug,
      lifecycleStatus: church.lifecycleStatus,
    },
    items,
    boundaryNote:
      'Technical account ops only. Platform cannot change membership, leadership, church roles, or organisational structure.',
  };
}

export async function patchTenantTechnicalAccount(
  ctx: PlatformCtx,
  churchId: string,
  userAccountId: string,
  body: PatchTenantAccountBody,
) {
  assertPlatformAccountsWrite(ctx);
  const db = getDb();
  const link = await accountsRepo.findTenantAccount(
    db,
    churchId,
    userAccountId,
  );
  if (!link) throw notFound();

  await accountsRepo.updateUserAccountStatus(
    db,
    userAccountId,
    body.status,
    ctx.actor.userAccountId,
  );

  await writePlatformAudit(db, ctx, {
    action: 'platform.tenant_account.status',
    entityType: 'user_account',
    entityId: userAccountId,
    churchId,
    metadata: sanitizeAuditMetadata({
      from: link.accountStatus,
      to: body.status,
      reason: body.reason,
    }),
  });

  return {
    churchId,
    userAccountId,
    status: body.status,
  };
}

export async function revokeTenantAccountSessions(
  ctx: PlatformCtx,
  churchId: string,
  userAccountId: string,
) {
  assertPlatformAccountsWrite(ctx);
  const db = getDb();
  const link = await accountsRepo.findTenantAccount(
    db,
    churchId,
    userAccountId,
  );
  if (!link) throw notFound();

  const revoked = await accountsRepo.revokeSessionsForUser(db, userAccountId);
  await writePlatformAudit(db, ctx, {
    action: 'platform.tenant_account.sessions.revoke',
    entityType: 'user_account',
    entityId: userAccountId,
    churchId,
    metadata: { revoked },
  });
  return { churchId, userAccountId, revoked };
}

export async function listServiceAccounts(ctx: PlatformCtx) {
  assertPlatformServiceAccounts(ctx);
  const db = getDb();
  const rows = await accountsRepo.listServiceAccounts(db);
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      purpose: r.purpose,
      ownerUserId: r.ownerUserId,
      status: r.status,
      scopes: r.scopes,
      environment: r.environment,
      credentialPrefix: r.credentialPrefix,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function createServiceAccount(
  ctx: PlatformCtx,
  body: CreateServiceAccountBody,
) {
  assertPlatformServiceAccounts(ctx);
  const db = getDb();
  if (await accountsRepo.findServiceAccountByName(db, body.name)) {
    throw conflict('A service account with this name already exists.');
  }

  const id = newId();
  const cred = newServiceSecret();
  await accountsRepo.insertServiceAccount(db, {
    id,
    name: body.name,
    purpose: body.purpose,
    ownerUserId: body.ownerUserId ?? ctx.actor.userAccountId,
    scopes: body.scopes,
    environment: body.environment,
    credentialHash: cred.hash,
    credentialPrefix: cred.prefix,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    actorUserId: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.service_account.create',
    entityType: 'platform_service_account',
    entityId: id,
    metadata: sanitizeAuditMetadata({
      name: body.name,
      scopes: body.scopes,
      environment: body.environment,
      // secret intentionally omitted
    }),
  });

  return {
    id,
    name: body.name,
    status: 'active' as const,
    credentialPrefix: cred.prefix,
    /** Shown once — store securely; never logged. */
    secret: cred.secret,
  };
}

export async function rotateServiceAccount(
  ctx: PlatformCtx,
  serviceAccountId: string,
  body: RotateServiceAccountBody,
) {
  assertPlatformServiceAccounts(ctx);
  const db = getDb();
  const row = await accountsRepo.getServiceAccountById(db, serviceAccountId);
  if (!row) throw notFound();
  if (row.status === 'revoked') {
    throw conflict('Revoked service accounts cannot be rotated; create a new one.');
  }

  const cred = newServiceSecret();
  await accountsRepo.updateServiceAccountCredentials(db, serviceAccountId, {
    credentialHash: cred.hash,
    credentialPrefix: cred.prefix,
    actorUserId: ctx.actor.userAccountId,
  });

  await writePlatformAudit(db, ctx, {
    action: 'platform.service_account.rotate',
    entityType: 'platform_service_account',
    entityId: serviceAccountId,
    metadata: sanitizeAuditMetadata({ reason: body.reason, name: row.name }),
  });

  return {
    id: serviceAccountId,
    name: row.name,
    credentialPrefix: cred.prefix,
    secret: cred.secret,
  };
}

export async function revokeServiceAccount(
  ctx: PlatformCtx,
  serviceAccountId: string,
  body: RevokeServiceAccountBody,
) {
  assertPlatformServiceAccounts(ctx);
  const db = getDb();
  const row = await accountsRepo.getServiceAccountById(db, serviceAccountId);
  if (!row) throw notFound();

  await accountsRepo.revokeServiceAccount(
    db,
    serviceAccountId,
    ctx.actor.userAccountId,
  );
  await writePlatformAudit(db, ctx, {
    action: 'platform.service_account.revoke',
    entityType: 'platform_service_account',
    entityId: serviceAccountId,
    metadata: sanitizeAuditMetadata({ reason: body.reason, name: row.name }),
  });

  return { id: serviceAccountId, status: 'revoked' as const };
}

export async function listChurchesForAccounts(ctx: PlatformCtx) {
  assertPlatformAccountsRead(ctx);
  const db = getDb();
  const rows = await accountsRepo.listChurchesBrief(db);
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      lifecycleStatus: r.lifecycleStatus,
    })),
  };
}
