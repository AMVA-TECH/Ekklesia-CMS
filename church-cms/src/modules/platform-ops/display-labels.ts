import { inArray } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { churches } from '@/modules/churches/db-schema';
import { userAccounts } from '@/modules/people/db-schema';

/** Resolve church ids → names for platform UI (never show raw UUIDs). */
export async function churchNameById(
  db: Db,
  ids: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const rows = await db
    .select({ id: churches.id, name: churches.name })
    .from(churches)
    .where(inArray(churches.id, unique));
  for (const row of rows) map.set(row.id, row.name);
  return map;
}

/** Resolve user account ids → email (fallback display name not available here). */
export async function emailByUserAccountId(
  db: Db,
  ids: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const rows = await db
    .select({ id: userAccounts.id, email: userAccounts.email })
    .from(userAccounts)
    .where(inArray(userAccounts.id, unique));
  for (const row of rows) {
    if (row.email) map.set(row.id, row.email);
  }
  return map;
}

export function labelOrDash(
  map: Map<string, string>,
  id: string | null | undefined,
): string {
  if (!id) return '—';
  return map.get(id) ?? '—';
}
