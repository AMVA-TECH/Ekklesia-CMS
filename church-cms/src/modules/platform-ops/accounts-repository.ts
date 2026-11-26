import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  session as authSession,
  user as authUser,
} from '@/platform/auth/db-schema';
import {
  organisationUsers,
  people,
  userAccounts,
} from '@/modules/people/db-schema';
import { churches } from '@/modules/churches/db-schema';
import {
  platformOperators,
  platformServiceAccounts,
} from './db-schema';

export async function getOperatorById(db: Db, id: string) {
  const rows = await db
    .select({
      id: platformOperators.id,
      userAccountId: platformOperators.userAccountId,
      status: platformOperators.status,
      permissions: platformOperators.permissions,
      createdAt: platformOperators.createdAt,
      updatedAt: platformOperators.updatedAt,
      email: userAccounts.email,
      phoneE164: userAccounts.phoneE164,
      accountStatus: userAccounts.status,
    })
    .from(platformOperators)
    .leftJoin(
      userAccounts,
      eq(userAccounts.id, platformOperators.userAccountId),
    )
    .where(
      and(eq(platformOperators.id, id), isNull(platformOperators.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function countActivePlatformAdmins(
  db: Db,
  exceptOperatorId?: string,
): Promise<number> {
  const rows = await db
    .select({
      id: platformOperators.id,
      permissions: platformOperators.permissions,
    })
    .from(platformOperators)
    .where(
      and(
        eq(platformOperators.status, 'active'),
        isNull(platformOperators.deletedAt),
        exceptOperatorId
          ? sql`${platformOperators.id} <> ${exceptOperatorId}::uuid`
          : sql`true`,
      ),
    );

  return rows.filter((r) => {
    const perms = r.permissions ?? [];
    return perms.includes('platform:admin') || perms.includes('platform:operators_manage');
  }).length;
}

export async function updateOperator(
  db: Db,
  id: string,
  patch: {
    status?: string;
    permissions?: string[];
    updatedBy: string;
  },
) {
  await db
    .update(platformOperators)
    .set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.permissions !== undefined
        ? { permissions: patch.permissions }
        : {}),
      updatedBy: patch.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(platformOperators.id, id));
}

export async function getAuthUserSecurity(db: Db, userAccountId: string) {
  const rows = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      twoFactorEnabled: authUser.twoFactorEnabled,
      emailVerified: authUser.emailVerified,
    })
    .from(authUser)
    .where(eq(authUser.id, userAccountId))
    .limit(1);
  return rows[0] ?? null;
}

export async function countSessionsForUser(db: Db, userAccountId: string) {
  const rows = await db
    .select({ n: count() })
    .from(authSession)
    .where(
      and(
        eq(authSession.userId, userAccountId),
        sql`${authSession.expiresAt} > now()`,
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function listSessions(
  db: Db,
  query: { userAccountId?: string; limit: number },
) {
  const conditions = [sql`${authSession.expiresAt} > now()`];
  if (query.userAccountId) {
    conditions.push(eq(authSession.userId, query.userAccountId));
  }
  return db
    .select({
      id: authSession.id,
      userId: authSession.userId,
      expiresAt: authSession.expiresAt,
      createdAt: authSession.createdAt,
      ipAddress: authSession.ipAddress,
      userAgent: authSession.userAgent,
      activeChurchId: authSession.activeChurchId,
      email: authUser.email,
      name: authUser.name,
    })
    .from(authSession)
    .leftJoin(authUser, eq(authUser.id, authSession.userId))
    .where(and(...conditions))
    .orderBy(desc(authSession.createdAt))
    .limit(query.limit);
}

export async function revokeSessionsForUser(db: Db, userAccountId: string) {
  const deleted = await db
    .delete(authSession)
    .where(eq(authSession.userId, userAccountId))
    .returning();
  return deleted.length;
}

export async function listTenantAccounts(
  db: Db,
  churchId: string,
  query: { q?: string; status?: string; limit: number },
) {
  const conditions = [
    eq(organisationUsers.churchId, churchId),
    isNull(organisationUsers.deletedAt),
    isNull(userAccounts.deletedAt),
  ];
  if (query.status) {
    conditions.push(eq(userAccounts.status, query.status));
  }
  if (query.q?.trim()) {
    const q = `%${query.q.trim()}%`;
    conditions.push(
      or(
        ilike(userAccounts.email, q),
        ilike(people.displayName, q),
        ilike(userAccounts.phoneE164, q),
      )!,
    );
  }

  return db
    .select({
      organisationUserId: organisationUsers.id,
      userAccountId: userAccounts.id,
      orgStatus: organisationUsers.status,
      accountStatus: userAccounts.status,
      email: userAccounts.email,
      phoneE164: userAccounts.phoneE164,
      displayName: people.displayName,
      personId: organisationUsers.personId,
      createdAt: organisationUsers.createdAt,
    })
    .from(organisationUsers)
    .innerJoin(
      userAccounts,
      eq(userAccounts.id, organisationUsers.userAccountId),
    )
    .leftJoin(people, eq(people.id, organisationUsers.personId))
    .where(and(...conditions))
    .orderBy(desc(organisationUsers.createdAt))
    .limit(query.limit);
}

export async function findTenantAccount(
  db: Db,
  churchId: string,
  userAccountId: string,
) {
  const rows = await db
    .select({
      organisationUserId: organisationUsers.id,
      userAccountId: userAccounts.id,
      orgStatus: organisationUsers.status,
      accountStatus: userAccounts.status,
      email: userAccounts.email,
    })
    .from(organisationUsers)
    .innerJoin(
      userAccounts,
      eq(userAccounts.id, organisationUsers.userAccountId),
    )
    .where(
      and(
        eq(organisationUsers.churchId, churchId),
        eq(organisationUsers.userAccountId, userAccountId),
        isNull(organisationUsers.deletedAt),
        isNull(userAccounts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateUserAccountStatus(
  db: Db,
  userAccountId: string,
  status: string,
  actorUserId: string,
) {
  await db
    .update(userAccounts)
    .set({
      status,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(userAccounts.id, userAccountId));
}

export async function listServiceAccounts(db: Db) {
  return db
    .select({
      id: platformServiceAccounts.id,
      name: platformServiceAccounts.name,
      purpose: platformServiceAccounts.purpose,
      ownerUserId: platformServiceAccounts.ownerUserId,
      status: platformServiceAccounts.status,
      scopes: platformServiceAccounts.scopes,
      environment: platformServiceAccounts.environment,
      credentialPrefix: platformServiceAccounts.credentialPrefix,
      expiresAt: platformServiceAccounts.expiresAt,
      lastUsedAt: platformServiceAccounts.lastUsedAt,
      revokedAt: platformServiceAccounts.revokedAt,
      createdAt: platformServiceAccounts.createdAt,
    })
    .from(platformServiceAccounts)
    .where(isNull(platformServiceAccounts.deletedAt))
    .orderBy(desc(platformServiceAccounts.createdAt));
}

export async function getServiceAccountById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(platformServiceAccounts)
    .where(
      and(
        eq(platformServiceAccounts.id, id),
        isNull(platformServiceAccounts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findServiceAccountByName(db: Db, name: string) {
  const rows = await db
    .select({ id: platformServiceAccounts.id })
    .from(platformServiceAccounts)
    .where(
      and(
        eq(platformServiceAccounts.name, name),
        isNull(platformServiceAccounts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertServiceAccount(
  db: Db,
  input: {
    id: string;
    name: string;
    purpose: string;
    ownerUserId?: string | null;
    scopes: string[];
    environment: string;
    credentialHash: string;
    credentialPrefix: string;
    expiresAt?: Date | null;
    actorUserId: string;
  },
) {
  await db.insert(platformServiceAccounts).values({
    id: input.id,
    name: input.name,
    purpose: input.purpose,
    ownerUserId: input.ownerUserId ?? null,
    status: 'active',
    scopes: input.scopes,
    environment: input.environment,
    credentialHash: input.credentialHash,
    credentialPrefix: input.credentialPrefix,
    expiresAt: input.expiresAt ?? null,
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });
}

export async function updateServiceAccountCredentials(
  db: Db,
  id: string,
  input: {
    credentialHash: string;
    credentialPrefix: string;
    actorUserId: string;
  },
) {
  await db
    .update(platformServiceAccounts)
    .set({
      credentialHash: input.credentialHash,
      credentialPrefix: input.credentialPrefix,
      status: 'active',
      revokedAt: null,
      updatedBy: input.actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(platformServiceAccounts.id, id));
}

export async function revokeServiceAccount(
  db: Db,
  id: string,
  actorUserId: string,
) {
  await db
    .update(platformServiceAccounts)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      credentialHash: null,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(platformServiceAccounts.id, id));
}

export async function listChurchesBrief(db: Db) {
  return db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      lifecycleStatus: churches.lifecycleStatus,
    })
    .from(churches)
    .where(isNull(churches.deletedAt))
    .orderBy(churches.name)
    .limit(200);
}
