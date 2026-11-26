import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import {
  platformAccessReviews,
  platformBreakGlassGrants,
  platformSupportCases,
  platformSupportSessions,
} from './db-schema';

export async function nextCaseNumber(db: Db): Promise<string> {
  const year = new Date().getUTCFullYear();
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(platformSupportCases)
    .where(sql`${platformSupportCases.caseNumber} like ${`SUP-${year}-%`}`);
  const seq = Number(rows[0]?.n ?? 0) + 1;
  return `SUP-${year}-${String(seq).padStart(5, '0')}`;
}

export async function insertSupportCase(
  db: Db,
  input: {
    id: string;
    caseNumber: string;
    title: string;
    description?: string | null;
    priority: string;
    severity: string;
    churchId?: string | null;
    reporterUserId: string;
  },
) {
  await db.insert(platformSupportCases).values({
    id: input.id,
    caseNumber: input.caseNumber,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    severity: input.severity,
    churchId: input.churchId ?? null,
    reporterUserId: input.reporterUserId,
    status: 'open',
    createdBy: input.reporterUserId,
    updatedBy: input.reporterUserId,
  });
}

export async function listSupportCases(
  db: Db,
  query: { status?: string; churchId?: string; limit: number },
) {
  const conditions = [isNull(platformSupportCases.deletedAt)];
  if (query.status) conditions.push(eq(platformSupportCases.status, query.status));
  if (query.churchId) {
    conditions.push(eq(platformSupportCases.churchId, query.churchId));
  }
  return db
    .select()
    .from(platformSupportCases)
    .where(and(...conditions))
    .orderBy(desc(platformSupportCases.createdAt))
    .limit(query.limit);
}

export async function getSupportCaseById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(platformSupportCases)
    .where(
      and(eq(platformSupportCases.id, id), isNull(platformSupportCases.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSupportCase(
  db: Db,
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    severity: string;
    assignedOperatorUserId: string | null;
    churchId: string | null;
    resolvedAt: Date | null;
    updatedBy: string;
  }>,
) {
  await db
    .update(platformSupportCases)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(platformSupportCases.id, id));
}

export async function insertSupportSession(
  db: Db,
  input: {
    id: string;
    caseId?: string | null;
    churchId: string;
    operatorUserId: string;
    purpose: string;
    accessLevel: string;
    expiresAt: Date;
    approvedByUserId?: string | null;
  },
) {
  await db.insert(platformSupportSessions).values({
    id: input.id,
    caseId: input.caseId ?? null,
    churchId: input.churchId,
    operatorUserId: input.operatorUserId,
    purpose: input.purpose,
    accessLevel: input.accessLevel,
    status: 'active',
    approvedByUserId: input.approvedByUserId ?? input.operatorUserId,
    expiresAt: input.expiresAt,
    createdBy: input.operatorUserId,
    updatedBy: input.operatorUserId,
  });
}

export async function listSupportSessions(
  db: Db,
  query: { status?: string; churchId?: string; limit: number },
) {
  const conditions = [isNull(platformSupportSessions.deletedAt)];
  if (query.status) {
    conditions.push(eq(platformSupportSessions.status, query.status));
  }
  if (query.churchId) {
    conditions.push(eq(platformSupportSessions.churchId, query.churchId));
  }
  return db
    .select()
    .from(platformSupportSessions)
    .where(and(...conditions))
    .orderBy(desc(platformSupportSessions.startedAt))
    .limit(query.limit);
}

export async function getSupportSessionById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(platformSupportSessions)
    .where(
      and(
        eq(platformSupportSessions.id, id),
        isNull(platformSupportSessions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeSupportSession(
  db: Db,
  id: string,
  reason: string,
  actorUserId: string,
) {
  await db
    .update(platformSupportSessions)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      revokeReason: reason,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(platformSupportSessions.id, id));
}

export async function expireDueSupportSessions(db: Db) {
  await db
    .update(platformSupportSessions)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(platformSupportSessions.status, 'active'),
        sql`${platformSupportSessions.expiresAt} < now()`,
        isNull(platformSupportSessions.deletedAt),
      ),
    );
}

/** Active, non-expired support session for an operator in a church. */
export async function findActiveSupportSession(
  db: Db,
  operatorUserId: string,
  churchId: string,
) {
  await expireDueSupportSessions(db);
  const rows = await db
    .select({
      id: platformSupportSessions.id,
      accessLevel: platformSupportSessions.accessLevel,
      expiresAt: platformSupportSessions.expiresAt,
      status: platformSupportSessions.status,
      churchId: platformSupportSessions.churchId,
    })
    .from(platformSupportSessions)
    .where(
      and(
        eq(platformSupportSessions.operatorUserId, operatorUserId),
        eq(platformSupportSessions.churchId, churchId),
        eq(platformSupportSessions.status, 'active'),
        sql`${platformSupportSessions.expiresAt} > now()`,
        isNull(platformSupportSessions.deletedAt),
      ),
    )
    .orderBy(desc(platformSupportSessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listActiveBreakGlassPermissions(
  db: Db,
  operatorUserId: string,
): Promise<string[]> {
  const rows = await db
    .select({
      permissions: platformBreakGlassGrants.permissions,
      expiresAt: platformBreakGlassGrants.expiresAt,
      status: platformBreakGlassGrants.status,
    })
    .from(platformBreakGlassGrants)
    .where(
      and(
        eq(platformBreakGlassGrants.operatorUserId, operatorUserId),
        eq(platformBreakGlassGrants.status, 'active'),
        isNull(platformBreakGlassGrants.deletedAt),
      ),
    );

  const now = Date.now();
  const merged = new Set<string>();
  for (const row of rows) {
    if (row.expiresAt.getTime() <= now) continue;
    for (const p of row.permissions ?? []) merged.add(p);
  }
  return [...merged];
}

export async function insertBreakGlassGrant(
  db: Db,
  input: {
    id: string;
    operatorUserId: string;
    reason: string;
    permissions: string[];
    expiresAt: Date;
    approvedByUserId: string;
  },
) {
  await db.insert(platformBreakGlassGrants).values({
    id: input.id,
    operatorUserId: input.operatorUserId,
    reason: input.reason,
    permissions: input.permissions,
    status: 'active',
    approvedByUserId: input.approvedByUserId,
    expiresAt: input.expiresAt,
    createdBy: input.approvedByUserId,
    updatedBy: input.approvedByUserId,
  });
}

export async function listBreakGlassGrants(db: Db, limit: number) {
  return db
    .select()
    .from(platformBreakGlassGrants)
    .where(isNull(platformBreakGlassGrants.deletedAt))
    .orderBy(desc(platformBreakGlassGrants.createdAt))
    .limit(limit);
}

export async function getBreakGlassById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(platformBreakGlassGrants)
    .where(
      and(
        eq(platformBreakGlassGrants.id, id),
        isNull(platformBreakGlassGrants.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeBreakGlass(
  db: Db,
  id: string,
  reason: string,
  actorUserId: string,
) {
  await db
    .update(platformBreakGlassGrants)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      revokeReason: reason,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(platformBreakGlassGrants.id, id));
}

export async function insertAccessReview(
  db: Db,
  input: {
    id: string;
    title: string;
    scope: string;
    dueAt?: Date | null;
    reviewerUserId: string;
    snapshot: Record<string, unknown>;
  },
) {
  await db.insert(platformAccessReviews).values({
    id: input.id,
    title: input.title,
    scope: input.scope,
    status: 'open',
    dueAt: input.dueAt ?? null,
    reviewerUserId: input.reviewerUserId,
    snapshot: input.snapshot,
    createdBy: input.reviewerUserId,
    updatedBy: input.reviewerUserId,
  });
}

export async function listAccessReviews(db: Db, limit: number) {
  return db
    .select()
    .from(platformAccessReviews)
    .where(isNull(platformAccessReviews.deletedAt))
    .orderBy(desc(platformAccessReviews.createdAt))
    .limit(limit);
}

export async function getAccessReviewById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(platformAccessReviews)
    .where(
      and(
        eq(platformAccessReviews.id, id),
        isNull(platformAccessReviews.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function completeAccessReview(
  db: Db,
  id: string,
  findingsSummary: string,
  actorUserId: string,
) {
  await db
    .update(platformAccessReviews)
    .set({
      status: 'completed',
      findingsSummary,
      completedAt: new Date(),
      reviewerUserId: actorUserId,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(platformAccessReviews.id, id));
}

export { newId };
