import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { assertCanReadAudit } from './policies';
import { sanitizeAuditMetadata } from './sanitize';
import type { ListAuditEventsQuery } from './schemas';
import * as repo from './repository';

export async function listAuditEvents(ctx: Ctx, query: ListAuditEventsQuery) {
  assertCanReadAudit(ctx);
  const rows = await repo.listAuditEvents(getDb(), ctx, query);
  return {
    data: rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: sanitizeAuditMetadata(
        (row.metadata ?? {}) as Record<string, unknown>,
      ),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
