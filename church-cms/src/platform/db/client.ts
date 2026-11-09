import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';

import * as schema from './schema';
import { getEnv } from '@/platform/config';

function isLocalPostgres(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  }
}

/**
 * DB client: `pg` for local Postgres; Neon HTTP for hosted Neon/Vercel.
 * Install `pg` (+ `@types/pg`) for local development.
 */
export function createDb(connectionString: string) {
  if (isLocalPostgres(connectionString)) {
    // Lazy require so Neon-only environments do not need the pg package at build time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg') as typeof import('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');
    const pool = new Pool({ connectionString });
    return drizzle(pool, { schema });
  }
  const sql = neon(connectionString);
  return drizzleNeon(sql, { schema });
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
