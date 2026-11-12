#!/usr/bin/env node
/**
 * Stage 5 — pilot ops readiness checks (local/dev DB + optional HTTP).
 *
 * Checks:
 *   1. Required env names present (values not printed)
 *   2. Migration count matches journal
 *   3. Sample tenant tables have RLS enabled + forced
 *   4. readDevSession is production-null (source guard)
 *   5. Optional GET /api/v1/health when APP_URL or PILOT_BASE_URL set
 *
 * Usage: pnpm pilot:ops-check
 * Exit 0 = PILOT_OPS_OK, else PILOT_OPS_FAIL
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EXPECTED_MIGRATIONS = 20;
const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}
function ok(msg) {
  notes.push(`ok  ${msg}`);
}

// --- 1. env ---
const required = ['DATABASE_URL'];
const recommended = ['DATABASE_URL_UNPOOLED', 'APP_URL'];
for (const k of required) {
  if (!process.env[k]) fail(`missing env ${k}`);
  else ok(`env ${k} set`);
}
for (const k of recommended) {
  if (!process.env[k]) notes.push(`warn ${k} not set`);
  else ok(`env ${k} set`);
}

if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('127.0.0.1')) {
  fail('NODE_ENV=production with localhost DATABASE_URL');
}

// --- 2–3. DB ---
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  '';

if (databaseUrl) {
  const url = new URL(databaseUrl);
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username || 'postgres'),
    PGPASSWORD: decodeURIComponent(url.password || ''),
    PGDATABASE: url.pathname.replace(/^\//, '') || 'church_cms',
  };

  function psql(sql) {
    return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], {
      env,
      encoding: 'utf8',
    }).trim();
  }

  try {
    const migCount = Number(psql(`SELECT count(*) FROM drizzle.__drizzle_migrations;`));
    if (migCount !== EXPECTED_MIGRATIONS) {
      fail(`migrations=${migCount} expected=${EXPECTED_MIGRATIONS}`);
    } else {
      ok(`migrations=${migCount}`);
    }

    // hash drift: every local SQL file should match a stored hash
    const dir = join(process.cwd(), 'drizzle');
    const files = readdirSync(dir)
      .filter((f) => /^\d+_.+\.sql$/.test(f))
      .sort();
    let drift = 0;
    for (const file of files) {
      const body = readFileSync(join(dir, file), 'utf8');
      const hash = createHash('sha256').update(body).digest('hex');
      const found = psql(
        `SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='${hash}' LIMIT 1;`,
      );
      if (found !== '1') {
        drift += 1;
        fail(`migration hash missing for ${file}`);
      }
    }
    if (!drift) ok(`migration hashes match (${files.length} files)`);

    const sample = [
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
      'organisational_units',
      'events',
      'message_templates',
    ];
    let rlsOk = 0;
    for (const t of sample) {
      const row = psql(
        `SELECT relrowsecurity::text || ',' || relforcerowsecurity::text FROM pg_class WHERE relname='${t}' LIMIT 1;`,
      );
      if (row !== 'true,true') fail(`RLS not forced on ${t} (got ${row || 'missing'})`);
      else rlsOk += 1;
    }
    if (rlsOk === sample.length) ok(`RLS enabled+forced on ${sample.length} sample tables`);
  } catch (e) {
    fail(`db check error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// --- 4. source guard ---
const devSessionPath = join(process.cwd(), 'src/platform/auth/dev-session.ts');
if (!existsSync(devSessionPath)) {
  fail('dev-session.ts missing');
} else {
  const src = readFileSync(devSessionPath, 'utf8');
  if (!src.includes("NODE_ENV === 'production'") || !src.includes('return null')) {
    fail('readDevSession must null out in production');
  } else {
    ok('readDevSession production null-out present');
  }
}

// --- 5. optional HTTP ---
const base = process.env.PILOT_BASE_URL || process.env.APP_URL;
if (base) {
  try {
    const res = execFileSync(
      'curl',
      ['-sf', '-m', '5', `${base.replace(/\/$/, '')}/api/v1/health`],
      { encoding: 'utf8' },
    );
    const body = JSON.parse(res);
    const status = body?.data?.status ?? body?.status;
    if (status !== 'ok') fail(`health status=${status}`);
    else ok('HTTP health ok');
  } catch (e) {
    fail(`HTTP health failed: ${e instanceof Error ? e.message : String(e)}`);
  }
} else {
  notes.push('warn skipped HTTP health (set PILOT_BASE_URL or APP_URL)');
}

for (const n of notes) console.log(n);
if (failures.length) {
  console.error('PILOT_OPS_FAIL');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('PILOT_OPS_OK');
