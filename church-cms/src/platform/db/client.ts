import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';
import { getEnv } from '@/platform/config';

/**
 * App DB client (HTTP driver).
 * Interactive tenant transactions move to WebSocket/pool mode when RLS is wired in runtime.
 */
export function createDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;

let singleton: Db | null = null;

/** Lazily create the process-wide DB client from validated env. */
export function getDb(): Db {
  if (singleton) return singleton;
  const env = getEnv();
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  singleton = createDb(env.DATABASE_URL);
  return singleton;
}

/** Test helper. */
export function setDbForTests(db: Db | null): void {
  singleton = db;
}
