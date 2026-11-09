import type { Ctx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { auditEvents } from '@/modules/platform/db-schema';
import { newId } from '@/platform/db/ids';

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/** Append an audit event. Prefer calling inside the same transaction as the mutation. */
export async function writeAudit(db: Db, ctx: Ctx, input: AuditInput): Promise<void> {
  await db.insert(auditEvents).values({
    id: newId(),
    churchId: ctx.churchId,
    actorUserId: ctx.actor.userAccountId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
  });
}
