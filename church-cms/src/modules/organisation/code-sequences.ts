import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '@/platform/db/client';
import { churchCodeSequences } from './db-schema';
import {
  CODE_NAMESPACES,
  codeNamespaceForUnitKind,
  type CodeNamespaceKey,
} from './constants';

export { codeNamespaceForUnitKind };

/**
 * Allocate the next human-readable code for a church namespace.
 * Concurrency-safe via upsert + increment in a single statement.
 * Codes are immutable once assigned; never reused.
 */
export async function allocateChurchCode(
  db: Db,
  churchId: string,
  key: CodeNamespaceKey,
): Promise<string> {
  const { namespace, prefix } = CODE_NAMESPACES[key];

  const [row] = await db
    .insert(churchCodeSequences)
    .values({
      churchId,
      namespace,
      nextValue: 2,
    })
    .onConflictDoUpdate({
      target: [churchCodeSequences.churchId, churchCodeSequences.namespace],
      set: {
        nextValue: sql`${churchCodeSequences.nextValue} + 1`,
      },
    })
    .returning({ nextValue: churchCodeSequences.nextValue });

  // After insert: nextValue=2 means we used 1.
  // After conflict update: returning is the new value, so code is new-1.
  const used = (row?.nextValue ?? 2) - 1;
  return `${prefix}-${String(used).padStart(6, '0')}`;
}

export async function peekNextCodeValue(
  db: Db,
  churchId: string,
  key: CodeNamespaceKey,
): Promise<number> {
  const { namespace } = CODE_NAMESPACES[key];
  const [row] = await db
    .select({ nextValue: churchCodeSequences.nextValue })
    .from(churchCodeSequences)
    .where(
      and(
        eq(churchCodeSequences.churchId, churchId),
        eq(churchCodeSequences.namespace, namespace),
      ),
    )
    .limit(1);
  return row?.nextValue ?? 1;
}
