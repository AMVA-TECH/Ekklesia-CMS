import { and, eq, isNull } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { platformOperators } from '@/modules/platform-ops/db-schema';
import type { PermissionCode } from '@/modules/access-control/permissions';

const DEFAULT_PLATFORM_PERMS: PermissionCode[] = [
  'platform:read',
  'platform:admin',
  'platform:impersonate_tenant',
  'platform:security_read',
];

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

  const permissions = Array.isArray(row.permissions)
    ? row.permissions.filter((p): p is string => typeof p === 'string')
    : [...DEFAULT_PLATFORM_PERMS];

  return {
    id: row.id,
    userAccountId: row.userAccountId,
    status: row.status,
    permissions: permissions.length > 0 ? permissions : [...DEFAULT_PLATFORM_PERMS],
  };
}
