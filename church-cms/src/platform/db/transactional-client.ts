import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeonWs } from 'drizzle-orm/neon-serverless';

import * as schema from './schema';
import { getEnv } from '@/platform/config';
import { createDb, getDb, type Db } from './client';

function isLocalPostgres(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return (
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1')
    );
  }
}

function configureNeonWebSocket(): void {
  // Node 22+ provides a global WebSocket; Neon Pool needs it for interactive txs.
  if (
    typeof WebSocket !== 'undefined' &&
    !(neonConfig as { webSocketConstructor?: unknown }).webSocketConstructor
  ) {
    (neonConfig as { webSocketConstructor?: typeof WebSocket }).webSocketConstructor =
      WebSocket;
  }
}

let txSingleton: Db | null = null;

/**
 * DB client that supports interactive transactions (required for RLS
 * `set_config` inside `withTenantTx`).
 *
 * - Local Postgres: same `pg` pool as `getDb()`
 * - Neon: WebSocket `Pool` via `drizzle-orm/neon-serverless`
 */
export function getTransactionalDb(): Db {
  if (txSingleton) return txSingleton;
  const env = getEnv();
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (isLocalPostgres(env.DATABASE_URL)) {
    txSingleton = getDb();
    return txSingleton;
  }

  configureNeonWebSocket();
  const pool = new NeonPool({ connectionString: env.DATABASE_URL });
  txSingleton = drizzleNeonWs(pool, { schema }) as unknown as Db;
  return txSingleton;
}

/** Whether tenant RLS transactions should be attempted for this process. */
export function shouldUseTenantTransactions(): boolean {
  const env = getEnv();
  const mode = env.DATABASE_TX_MODE ?? 'auto';
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  if (!env.DATABASE_URL) return false;
  if (isLocalPostgres(env.DATABASE_URL)) return true;
  // Neon auto: use WS pool when WebSocket is available in the runtime.
  return typeof WebSocket !== 'undefined';
}

/** Test helper. */
export function setTransactionalDbForTests(db: Db | null): void {
  txSingleton = db;
}

/** Build a fresh transactional client (tests / one-offs). */
export function createTransactionalDb(connectionString: string): Db {
  if (isLocalPostgres(connectionString)) {
    return createDb(connectionString);
  }
  configureNeonWebSocket();
  const pool = new NeonPool({ connectionString });
  return drizzleNeonWs(pool, { schema }) as unknown as Db;
}
