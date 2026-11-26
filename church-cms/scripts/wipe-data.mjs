#!/usr/bin/env node
/**
 * Truncate all public application tables. Keeps schema + drizzle.__drizzle_migrations.
 *
 * Safety:
 *   CONFIRM=WIPE or --confirm required
 *   Local hosts only unless ALLOW_REMOTE_WIPE=1
 *
 * Usage: CONFIRM=WIPE pnpm db:wipe-data
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv();

const require = createRequire(import.meta.url);

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/church_cms';

const confirmed =
  process.env.CONFIRM === 'WIPE' || process.argv.includes('--confirm');

function isLocalHost(hostname) {
  const host = (hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local')
  );
}

async function main() {
  if (!confirmed) {
    console.error(
      'Refusing wipe: set CONFIRM=WIPE or pass --confirm',
    );
    process.exitCode = 1;
    return;
  }

  const url = new URL(databaseUrl);
  if (!isLocalHost(url.hostname) && process.env.ALLOW_REMOTE_WIPE !== '1') {
    console.error(
      `Refusing wipe of non-local host "${url.hostname}". Set ALLOW_REMOTE_WIPE=1 if intentional.`,
    );
    process.exitCode = 1;
    return;
  }

  let Pool;
  try {
    ({ Pool } = require('pg'));
  } catch {
    ({ Pool } = require('/tmp/pg-full/node_modules/pg'));
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    const { rows: tables } = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    if (tables.length === 0) {
      console.log('WIPE_OK', { truncated: 0, note: 'no public tables' });
      return;
    }

    const names = tables.map((t) => `"${t.tablename}"`);
    await client.query(
      `TRUNCATE TABLE ${names.join(', ')} RESTART IDENTITY CASCADE`,
    );

    const checks = await client.query(`
      SELECT
        (SELECT count(*)::int FROM churches) AS churches,
        (SELECT count(*)::int FROM platform_operators) AS platform_operators,
        (SELECT count(*)::int FROM permissions) AS permissions,
        (SELECT count(*)::int FROM user_accounts) AS user_accounts,
        (SELECT count(*)::int FROM "user") AS ba_users
    `);

    console.log('WIPE_OK', {
      host: url.hostname,
      database: url.pathname.replace(/^\//, ''),
      truncated: names.length,
      counts: checks.rows[0],
    });
  } catch (error) {
    console.error('WIPE_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
