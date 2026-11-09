#!/usr/bin/env node
/**
 * Apply drizzle/*.sql to local Postgres (psql).
 * Neon-hosted envs should use `pnpm db:migrate` with the unpooled URL.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/church_cms';

const url = new URL(databaseUrl);
const psqlEnv = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username || 'postgres'),
  PGPASSWORD: decodeURIComponent(url.password || ''),
  PGDATABASE: url.pathname.replace(/^\//, '') || 'church_cms',
};

function psql(sql) {
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-c', sql], {
    env: psqlEnv,
    encoding: 'utf8',
  });
}

function psqlFile(sql) {
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    env: psqlEnv,
    input: sql,
    encoding: 'utf8',
  });
}

psql(`
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
`);

const dir = join(process.cwd(), 'drizzle');
const files = readdirSync(dir)
  .filter((f) => /^\d+_.+\.sql$/.test(f))
  .sort();

for (const file of files) {
  const body = readFileSync(join(dir, file), 'utf8');
  const hash = createHash('sha256').update(body).digest('hex');
  const applied = psql(
    `SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='${hash}' LIMIT 1;`,
  ).trim();
  if (applied.includes('1')) {
    console.log(`skip ${file}`);
    continue;
  }
  const cleaned = body.replace(/--> statement-breakpoint/g, '');
  psqlFile(cleaned);
  psql(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('${hash}', ${Date.now()});`,
  );
  console.log(`applied ${file}`);
}
