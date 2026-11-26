import { and, desc, ilike, isNull, or } from 'drizzle-orm';

import type { PlatformCtx } from '@/platform/auth/ctx';
import { getDb } from '@/platform/db/client';
import { churches } from '@/modules/churches/db-schema';
import { userAccounts } from '@/modules/people/db-schema';
import {
  platformAuditEvents,
  platformSupportCases,
  securityFindings,
} from './db-schema';
import { assertPlatformRead } from './policies';
import type { PlatformSearchQuery } from './schemas';

export type SearchHit = {
  id: string;
  kind: 'church' | 'account' | 'finding' | 'audit' | 'support_case';
  primary: string;
  secondary: string;
  status?: string;
  href: string;
};

/**
 * Cross-entity platform search. Aggregate / directory fields only —
 * no finance or Restricted pastoral data.
 */
export async function searchPlatform(
  ctx: PlatformCtx,
  query: PlatformSearchQuery,
) {
  assertPlatformRead(ctx);
  const q = query.q.trim();
  const needle = `%${q}%`;
  const db = getDb();
  const perms = ctx.platformPermissions;
  const admin = perms.has('platform:admin');

  const results: SearchHit[] = [];

  if (admin || perms.has('platform:churches_read')) {
    const rows = await db
      .select({
        id: churches.id,
        name: churches.name,
        slug: churches.slug,
        lifecycleStatus: churches.lifecycleStatus,
      })
      .from(churches)
      .where(
        and(
          isNull(churches.deletedAt),
          or(ilike(churches.name, needle), ilike(churches.slug, needle)),
        ),
      )
      .orderBy(desc(churches.createdAt))
      .limit(10);
    for (const row of rows) {
      results.push({
        id: row.id,
        kind: 'church',
        primary: row.name,
        secondary: row.slug,
        status: row.lifecycleStatus,
        href: `/platform/churches/${row.id}`,
      });
    }
  }

  if (
    admin ||
    perms.has('platform:accounts_read') ||
    perms.has('platform:operators_manage')
  ) {
    const rows = await db
      .select({
        id: userAccounts.id,
        email: userAccounts.email,
        phoneE164: userAccounts.phoneE164,
        status: userAccounts.status,
      })
      .from(userAccounts)
      .where(
        and(
          isNull(userAccounts.deletedAt),
          or(
            ilike(userAccounts.email, needle),
            ilike(userAccounts.phoneE164, needle),
          ),
        ),
      )
      .limit(10);
    for (const row of rows) {
      results.push({
        id: row.id,
        kind: 'account',
        primary: row.email || row.phoneE164 || row.id,
        secondary: [row.email, row.phoneE164].filter(Boolean).join(' · '),
        status: row.status ?? undefined,
        href: `/platform/access`,
      });
    }
  }

  if (admin || perms.has('platform:security_read')) {
    const rows = await db
      .select({
        id: securityFindings.id,
        title: securityFindings.title,
        severity: securityFindings.severity,
        status: securityFindings.status,
        category: securityFindings.category,
      })
      .from(securityFindings)
      .where(
        or(
          ilike(securityFindings.title, needle),
          ilike(securityFindings.category, needle),
          ilike(securityFindings.detectorKey, needle),
        ),
      )
      .orderBy(desc(securityFindings.lastSeenAt))
      .limit(10);
    for (const row of rows) {
      results.push({
        id: row.id,
        kind: 'finding',
        primary: row.title,
        secondary: `${row.severity} · ${row.category}`,
        status: row.status,
        href: `/platform/security`,
      });
    }
  }

  if (
    admin ||
    perms.has('platform:audit_read') ||
    perms.has('platform:security_read')
  ) {
    const rows = await db
      .select({
        id: platformAuditEvents.id,
        action: platformAuditEvents.action,
        entityType: platformAuditEvents.entityType,
        requestId: platformAuditEvents.requestId,
      })
      .from(platformAuditEvents)
      .where(
        or(
          ilike(platformAuditEvents.action, needle),
          ilike(platformAuditEvents.requestId, needle),
          ilike(platformAuditEvents.entityId, needle),
        ),
      )
      .orderBy(desc(platformAuditEvents.createdAt))
      .limit(10);
    for (const row of rows) {
      results.push({
        id: row.id,
        kind: 'audit',
        primary: row.action,
        secondary: `${row.entityType}${row.requestId ? ` · ${row.requestId}` : ''}`,
        href: `/platform/audit?q=${encodeURIComponent(row.action)}`,
      });
    }
  }

  if (admin || perms.has('platform:support_cases')) {
    const rows = await db
      .select({
        id: platformSupportCases.id,
        caseNumber: platformSupportCases.caseNumber,
        title: platformSupportCases.title,
        status: platformSupportCases.status,
        severity: platformSupportCases.severity,
      })
      .from(platformSupportCases)
      .where(
        and(
          isNull(platformSupportCases.deletedAt),
          or(
            ilike(platformSupportCases.title, needle),
            ilike(platformSupportCases.caseNumber, needle),
          ),
        ),
      )
      .orderBy(desc(platformSupportCases.createdAt))
      .limit(10);
    for (const row of rows) {
      results.push({
        id: row.id,
        kind: 'support_case',
        primary: `${row.caseNumber} · ${row.title}`,
        secondary: `${row.severity} · ${row.status}`,
        status: row.status,
        href: `/platform/support`,
      });
    }
  }

  return { query: q, results };
}
