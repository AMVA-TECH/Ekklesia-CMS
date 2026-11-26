import { and, count, eq, gte, isNull, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { churches } from '@/modules/churches/db-schema';
import {
  churchRegistrationApplications,
  tenantProvisioningRequests,
  platformSupportCases,
  platformSupportSessions,
  securityFindings,
} from './db-schema';

export async function countChurchesByLifecycle(db: Db) {
  const rows = await db
    .select({
      lifecycleStatus: churches.lifecycleStatus,
      n: count(),
    })
    .from(churches)
    .where(isNull(churches.deletedAt))
    .groupBy(churches.lifecycleStatus);

  const out: Record<string, number> = {};
  for (const row of rows) out[row.lifecycleStatus] = Number(row.n);
  return out;
}

export async function countRegistrationApplicationsByStatus(db: Db) {
  const rows = await db
    .select({
      status: churchRegistrationApplications.status,
      n: count(),
    })
    .from(churchRegistrationApplications)
    .where(isNull(churchRegistrationApplications.deletedAt))
    .groupBy(churchRegistrationApplications.status);

  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = Number(row.n);
  return out;
}

export async function countProvisioningByStatus(db: Db) {
  const rows = await db
    .select({
      status: tenantProvisioningRequests.status,
      n: count(),
    })
    .from(tenantProvisioningRequests)
    .where(isNull(tenantProvisioningRequests.deletedAt))
    .groupBy(tenantProvisioningRequests.status);

  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = Number(row.n);
  return out;
}

export async function countSupportCasesByStatus(db: Db) {
  const rows = await db
    .select({
      status: platformSupportCases.status,
      n: count(),
    })
    .from(platformSupportCases)
    .where(isNull(platformSupportCases.deletedAt))
    .groupBy(platformSupportCases.status);

  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = Number(row.n);
  return out;
}

export async function countActiveSupportSessions(db: Db): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(platformSupportSessions)
    .where(
      and(
        eq(platformSupportSessions.status, 'active'),
        isNull(platformSupportSessions.deletedAt),
        sql`${platformSupportSessions.expiresAt} > now()`,
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function countFindingsBySeverity(db: Db) {
  const rows = await db
    .select({
      severity: securityFindings.severity,
      n: count(),
    })
    .from(securityFindings)
    .where(eq(securityFindings.status, 'open'))
    .groupBy(securityFindings.severity);

  const out: Record<string, number> = {};
  for (const row of rows) out[row.severity] = Number(row.n);
  return out;
}

export async function countRegistrationsSince(db: Db, since: Date) {
  const rows = await db
    .select({ n: count() })
    .from(churchRegistrationApplications)
    .where(
      and(
        gte(churchRegistrationApplications.createdAt, since),
        isNull(churchRegistrationApplications.deletedAt),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}
