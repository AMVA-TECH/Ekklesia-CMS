#!/usr/bin/env node
/**
 * Auth/me DB smoke: actor belongs to church with an active role assignment.
 */
import { createRequire } from 'node:module';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/church_cms';

const require = createRequire(import.meta.url);
let Pool;
try {
  ({ Pool } = require('pg'));
} catch {
  ({ Pool } = require('/tmp/pg-full/node_modules/pg'));
}

const churchId = '11111111-1111-1111-1111-111111111111';
const userId = 'cccccccc-0001-0001-0001-000000000001';
const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);
    const check = await client.query(
      `SELECT u.email,
              c.name AS church_name,
              o.person_id IS NOT NULL AS has_person,
              r.code AS role_code
       FROM user_accounts u
       JOIN organisation_users o
         ON o.user_account_id = u.id AND o.church_id = $1 AND o.deleted_at IS NULL
       JOIN churches c ON c.id = $1
       JOIN user_role_assignments a
         ON a.user_account_id = u.id AND a.church_id = $1 AND a.deleted_at IS NULL
       JOIN roles r ON r.id = a.role_id
       WHERE u.id = $2`,
      [churchId, userId],
    );
    if (!check.rows[0]) throw new Error('seed actor/church/role missing');
    console.log('SMOKE_AUTH_ME_OK', check.rows[0]);
  } catch (error) {
    console.error('SMOKE_AUTH_ME_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
