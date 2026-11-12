import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { auditEvents } from '@/modules/platform/db-schema';
import type { ListAuditEventsQuery } from './schemas';

export async function listAuditEvents(
  db: Db,
  ctx: Ctx,
  query: ListAuditEventsQuery,
) {
  const conditions = [eq(auditEvents.churchId, ctx.churchId)];
  if (query.from) conditions.push(gte(auditEvents.createdAt, new Date(query.from)));
  if (query.to) conditions.push(lte(auditEvents.createdAt, new Date(query.to)));
  if (query.action) conditions.push(eq(auditEvents.action, query.action));
  if (query.entityType) conditions.push(eq(auditEvents.entityType, query.entityType));
  if (query.entityId) conditions.push(eq(auditEvents.entityId, query.entityId));
  if (query.actorUserId) {
    conditions.push(eq(auditEvents.actorUserId, query.actorUserId));
  }

  return db
    .select({
      id: auditEvents.id,
      actorUserId: auditEvents.actorUserId,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(desc(auditEvents.createdAt))
    .limit(query.limit);
}

export async function countAuditEvents(db: Db, ctx: Ctx) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditEvents)
    .where(eq(auditEvents.churchId, ctx.churchId));
  return Number(row?.count ?? 0);
}
