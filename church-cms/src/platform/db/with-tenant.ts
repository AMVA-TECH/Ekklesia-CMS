import type { Db } from './client';
import { getDb } from './client';
import {
  getTransactionalDb,
  shouldUseTenantTransactions,
} from './transactional-client';
import { setRlsChurchIdSql } from './tenant';

/**
 * Run work with tenant RLS context when the driver supports transactions.
 *
 * - Local `pg` and Neon WebSocket Pool: `set_config('app.church_id', …, true)`
 *   inside a transaction.
 * - Neon HTTP / `DATABASE_TX_MODE=off`: fall back to the plain DB client;
 *   repository `church_id` filters remain authoritative.
 */
export async function withTenantTx<T>(
  churchId: string,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  if (!shouldUseTenantTransactions()) {
    return fn(getDb());
  }

  const db = getTransactionalDb();
  return db.transaction(async (tx) => {
    await tx.execute(setRlsChurchIdSql(churchId));
    return fn(tx as unknown as Db);
  });
}
