#!/usr/bin/env node
/**
 * Stage 5 — migration rehearsal on a throwaway local database.
 *
 * Creates church_cms_rehearsal, applies all drizzle/*.sql migrations,
 * verifies migration count + RLS forced on tenant tables, then
 * pg_dump → restore into church_cms_rehearsal_restore and re-checks.
 *
 * Env:
 *   DATABASE_URL / DATABASE_URL_UNPOOLED — admin URL (postgres role OK)
 *   KEEP_REHEARSAL_DB=1 — leave rehearsal DBs after run
 *
 * Usage: pnpm db:rehearse
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REHEARSAL = 'church_cms_rehearsal';
const RESTORE = 'church_cms_rehearsal_restore';
const EXPECTED_MIGRATIONS = 19;

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/church_cms';

const url = new URL(databaseUrl);
const baseEnv = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username || 'postgres'),
  PGPASSWORD: decodeURIComponent(url.password || ''),
};

function psql(db, sql, opts = {}) {
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-d', db, '-c', sql], {
    env: { ...baseEnv, PGDATABASE: db },
    encoding: 'utf8',
    ...opts,
  });
}

function psqlFile(db, sql) {
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-d', db, '-f', '-'], {
    env: { ...baseEnv, PGDATABASE: db },
    input: sql,
    encoding: 'utf8',
  });
}

function pgDump(db, outPath) {
  execFileSync('pg_dump', ['-d', db, '-Fc', '-f', outPath], {
    env: { ...baseEnv, PGDATABASE: db },
    stdio: 'inherit',
  });
}

function pgRestore(db, dumpPath) {
  execFileSync('pg_restore', ['-d', db, '--clean', '--if-exists', dumpPath], {
    env: { ...baseEnv, PGDATABASE: db },
    stdio: 'inherit',
  });
}

function dropDb(name) {
  try {
    psql('postgres', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${name}' AND pid <> pg_backend_pid();`);
  } catch {
    /* ignore */
  }
  psql('postgres', `DROP DATABASE IF EXISTS ${name};`);
}

function createDb(name) {
  dropDb(name);
  psql('postgres', `CREATE DATABASE ${name};`);
}

function applyMigrations(db) {
  psql(
    db,
    `
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
`,
  );

  const dir = join(process.cwd(), 'drizzle');
  const files = readdirSync(dir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const body = readFileSync(join(dir, file), 'utf8');
    const hash = createHash('sha256').update(body).digest('hex');
    const applied = psql(
      db,
      `SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='${hash}' LIMIT 1;`,
    ).trim();
    if (applied.includes('1')) {
      console.log(`  skip ${file}`);
      continue;
    }
    const cleaned = body.replace(/--> statement-breakpoint/g, '');
    psqlFile(db, cleaned);
    psql(
      db,
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('${hash}', ${Date.now()});`,
    );
    console.log(`  applied ${file}`);
  }
  return files.length;
}

function verify(db, label) {
  const failures = [];

  const migCount = Number(
    execFileSync(
      'psql',
      [
        '-v',
        'ON_ERROR_STOP=1',
        '-d',
        db,
        '-t',
        '-A',
        '-c',
        `SELECT count(*) FROM drizzle.__drizzle_migrations;`,
      ],
      { env: { ...baseEnv, PGDATABASE: db }, encoding: 'utf8' },
    ).trim(),
  );
  if (migCount !== EXPECTED_MIGRATIONS) {
    failures.push(`${label}: migrations=${migCount} expected=${EXPECTED_MIGRATIONS}`);
  } else {
    console.log(`  ok migrations=${migCount}`);
  }

  const tenantMustHaveRls = [
    'people',
    'person_contacts',
    'user_accounts',
    'memberships',
    'membership_decisions',
    'membership_status_history',
    'households',
    'funds',
    'journals',
    'import_jobs',
    'import_row_results',
    'organisational_units',
    'events',
    'message_templates',
  ];
  const missing = [];
  for (const t of tenantMustHaveRls) {
    const row = execFileSync(
      'psql',
      [
        '-v',
        'ON_ERROR_STOP=1',
        '-d',
        db,
        '-t',
        '-A',
        '-c',
        `SELECT relrowsecurity::text || ',' || relforcerowsecurity::text FROM pg_class WHERE relname='${t}' LIMIT 1;`,
      ],
      { env: { ...baseEnv, PGDATABASE: db }, encoding: 'utf8' },
    ).trim();
    if (row !== 'true,true') missing.push(`${t}=${row || 'missing'}`);
  }
  if (missing.length) {
    failures.push(`${label}: RLS not forced on ${missing.join('; ')}`);
  } else {
    console.log(`  ok RLS forced on sample tenant tables`);
  }

  const publicTables = Number(
    execFileSync(
      'psql',
      ['-v', 'ON_ERROR_STOP=1', '-d', db, '-t', '-A', '-c', `SELECT count(*) FROM pg_tables WHERE schemaname='public';`],
      { env: { ...baseEnv, PGDATABASE: db }, encoding: 'utf8' },
    ).trim(),
  );
  if (publicTables < 20) {
    failures.push(`${label}: public tables=${publicTables} (expected >= 20)`);
  } else {
    console.log(`  ok public_tables=${publicTables}`);
  }

  return failures;
}

const keep = process.env.KEEP_REHEARSAL_DB === '1';
const tmp = mkdtempSync(join(tmpdir(), 'cms-rehearse-'));
const dumpPath = join(tmp, 'rehearsal.dump');
const allFailures = [];

try {
  console.log('== migrate rehearsal: create + migrate ==');
  createDb(REHEARSAL);
  const n = applyMigrations(REHEARSAL);
  console.log(`  migration files processed: ${n}`);
  allFailures.push(...verify(REHEARSAL, 'rehearsal'));

  console.log('== backup / restore ==');
  pgDump(REHEARSAL, dumpPath);
  createDb(RESTORE);
  // empty restore target needs extensions/roles only; custom format restore recreates objects
  pgRestore(RESTORE, dumpPath);
  allFailures.push(...verify(RESTORE, 'restore'));

  if (allFailures.length) {
    console.error('\nREHEARSAL_FAIL');
    for (const f of allFailures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('\nREHEARSAL_OK');
  }
} finally {
  writeFileSync(join(tmp, 'done'), '1');
  if (!keep) {
    dropDb(REHEARSAL);
    dropDb(RESTORE);
    rmSync(tmp, { recursive: true, force: true });
  } else {
    console.log(`kept DBs ${REHEARSAL}, ${RESTORE}; dump ${dumpPath}`);
  }
}
