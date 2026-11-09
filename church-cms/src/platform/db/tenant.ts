import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Always scope tenant tables by church_id from Ctx — never from the client.
 */
export function eqChurchId(column: PgColumn, churchId: string): SQL {
  return sql`${column} = ${churchId}::uuid`;
}

/**
 * Transaction-local RLS setting (safe with pooled connections).
 * Must run inside the same transaction as tenant queries.
 */
export function setRlsChurchIdSql(churchId: string): SQL {
  return sql`select set_config('app.church_id', ${churchId}, true)`;
}
