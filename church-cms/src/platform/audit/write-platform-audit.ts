import type { PlatformCtx } from '@/platform/auth';
import type { Db } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { platformAuditEvents } from '@/modules/platform-ops/db-schema';

export interface PlatformAuditInput {
  action: string;
  entityType: string;
  entityId?: string;
  churchId?: string;
  outcome?: 'success' | 'failure' | 'denied';
  reason?: string;
  ipHash?: string;
  metadata?: Record<string, unknown>;
}

/** Append a platform audit event. Prefer same transaction as the mutation. */
export async function writePlatformAudit(
  db: Db,
  ctx: PlatformCtx,
  input: PlatformAuditInput,
): Promise<void> {
  await db.insert(platformAuditEvents).values({
    id: newId(),
    actorUserId: ctx.actor.userAccountId,
    action: input.action,
    outcome: input.outcome ?? 'success',
    churchId: input.churchId ?? ctx.churchId,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: ctx.requestId,
    ipHash: input.ipHash,
    reason: input.reason,
    metadata: input.metadata ?? {},
  });
}
