import { and, count, eq, gte } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';

import type { PlatformCtx } from '@/platform/auth/ctx';
import { account } from '@/platform/auth/db-schema';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import { getDb } from '@/platform/db/client';
import { forbidden } from '@/platform/errors';
import { platformAuditEvents } from './db-schema';
import type { ReauthBody } from './schemas';

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

/**
 * Confirm the signed-in operator's PIN before destructive platform mutations.
 * Failures are audited; five failures in fifteen minutes lock further attempts.
 */
export async function confirmOperatorPin(ctx: PlatformCtx, body: ReauthBody) {
  const db = getDb();
  const userId = ctx.actor.userAccountId;
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const [failRow] = await db
    .select({ n: count() })
    .from(platformAuditEvents)
    .where(
      and(
        eq(platformAuditEvents.actorUserId, userId),
        eq(platformAuditEvents.action, 'platform.reauth_failed'),
        gte(platformAuditEvents.createdAt, since),
      ),
    );

  if (Number(failRow?.n ?? 0) >= MAX_FAILURES) {
    throw forbidden(
      `Too many failed PIN confirmations. Wait ${WINDOW_MINUTES} minutes and try again.`,
    );
  }

  const [cred] = await db
    .select({ password: account.password })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, 'credential')),
    )
    .limit(1);

  const hash = cred?.password;
  const ok =
    Boolean(hash) &&
    (await verifyPassword({ hash: hash!, password: body.pin }));

  if (!ok) {
    await writePlatformAudit(db, ctx, {
      action: 'platform.reauth_failed',
      entityType: 'platform_operator',
      entityId: userId,
      outcome: 'denied',
      metadata: sanitizeAuditMetadata({ windowMinutes: WINDOW_MINUTES }),
    });
    throw forbidden('PIN confirmation failed.');
  }

  await writePlatformAudit(db, ctx, {
    action: 'platform.reauth_ok',
    entityType: 'platform_operator',
    entityId: userId,
    metadata: {},
  });

  return { confirmed: true as const };
}
