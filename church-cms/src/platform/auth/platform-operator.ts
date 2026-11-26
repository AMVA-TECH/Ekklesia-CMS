import { and, eq, isNull } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { platformOperators } from '@/modules/platform-ops/db-schema';
import { DEFAULT_PLATFORM_PERMISSIONS } from '@/modules/platform-ops/platform-permissions';

const DEFAULT_PLATFORM_PERMS = [...DEFAULT_PLATFORM_PERMISSIONS];

export type PlatformOperatorRow = {
  id: string;
  userAccountId: string;
  status: string;
  permissions: string[];
};

/** Load active platform operator membership for a user account. */
export async function findActivePlatformOperator(
  db: Db,
  userAccountId: string,
): Promise<PlatformOperatorRow | null> {
  const rows = await db
    .select({
      id: platformOperators.id,
      userAccountId: platformOperators.userAccountId,
      status: platformOperators.status,
      permissions: platformOperators.permissions,
    })
    .from(platformOperators)
    .where(
      and(
        eq(platformOperators.userAccountId, userAccountId),
        eq(platformOperators.status, 'active'),
        isNull(platformOperators.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const base = Array.isArray(row.permissions)
    ? row.permissions.filter((p): p is string => typeof p === 'string')
    : [...DEFAULT_PLATFORM_PERMS];

  // Phase 6: merge time-limited break-glass grants into effective permissions.
  let breakGlass: string[] = [];
  try {
    const { listActiveBreakGlassPermissions } = await import(
      '@/modules/platform-ops/support-repository'
    );
    breakGlass = await listActiveBreakGlassPermissions(db, userAccountId);
  } catch {
    breakGlass = [];
  }

  const permissions = [...new Set([...base, ...breakGlass])];

  return {
    id: row.id,
    userAccountId: row.userAccountId,
    status: row.status,
    permissions: permissions.length > 0 ? permissions : [...DEFAULT_PLATFORM_PERMS],
  };
}
