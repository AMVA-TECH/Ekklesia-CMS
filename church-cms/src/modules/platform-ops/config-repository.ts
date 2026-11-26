import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { platformConfig } from './db-schema';

export type PlatformConfigScope = 'global' | 'defaults' | 'tenant';

export async function getConfigByScope(
  db: Db,
  scope: 'global' | 'defaults',
) {
  const rows = await db
    .select()
    .from(platformConfig)
    .where(
      and(eq(platformConfig.scope, scope), isNull(platformConfig.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getTenantConfig(db: Db, churchId: string) {
  const rows = await db
    .select()
    .from(platformConfig)
    .where(
      and(
        eq(platformConfig.scope, 'tenant'),
        eq(platformConfig.churchId, churchId),
        isNull(platformConfig.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listTenantConfigs(db: Db, limit: number) {
  return db
    .select()
    .from(platformConfig)
    .where(
      and(eq(platformConfig.scope, 'tenant'), isNull(platformConfig.deletedAt)),
    )
    .orderBy(desc(platformConfig.updatedAt))
    .limit(limit);
}

export async function upsertConfig(
  db: Db,
  input: {
    id: string;
    scope: PlatformConfigScope;
    churchId: string | null;
    document: Record<string, unknown>;
    actorUserId: string;
  },
) {
  if (input.scope === 'tenant') {
    const existing = input.churchId
      ? await getTenantConfig(db, input.churchId)
      : null;
    if (existing) {
      await db
        .update(platformConfig)
        .set({
          document: input.document,
          updatedAt: new Date(),
          updatedBy: input.actorUserId,
        })
        .where(eq(platformConfig.id, existing.id));
      return existing.id;
    }
  } else {
    const existing = await getConfigByScope(db, input.scope);
    if (existing) {
      await db
        .update(platformConfig)
        .set({
          document: input.document,
          updatedAt: new Date(),
          updatedBy: input.actorUserId,
        })
        .where(eq(platformConfig.id, existing.id));
      return existing.id;
    }
  }

  await db.insert(platformConfig).values({
    id: input.id,
    scope: input.scope,
    churchId: input.churchId,
    document: input.document,
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });
  return input.id;
}

export async function configLayerStatus(db: Db) {
  const rows = await db
    .select({
      scope: platformConfig.scope,
      n: sql<number>`count(*)::int`,
    })
    .from(platformConfig)
    .where(isNull(platformConfig.deletedAt))
    .groupBy(platformConfig.scope);

  const byScope: Record<string, number> = {};
  for (const row of rows) byScope[row.scope] = Number(row.n);
  return {
    globalConfigured: (byScope.global ?? 0) > 0,
    defaultsConfigured: (byScope.defaults ?? 0) > 0,
    tenantOverrideCount: byScope.tenant ?? 0,
  };
}
