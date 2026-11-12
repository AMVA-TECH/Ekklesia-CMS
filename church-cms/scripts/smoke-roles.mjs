#!/usr/bin/env node
/**
 * Roles / role-assignments DB smoke.
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
const actorId = 'cccccccc-0001-0001-0001-000000000001';
const roleId = 'bbbbbbbb-0001-0001-0001-000000000001';
const id = () => crypto.randomUUID();
const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);

    const userId = id();
    const assignmentId = id();
    const personId = id();

    await client.query(
      `INSERT INTO user_accounts (id, email, phone_e164, status)
       VALUES ($1, $2, $3, 'active')`,
      [userId, `smoke-role-${userId.slice(0, 8)}@example.test`, `+2557${userId.replace(/\D/g, '').slice(0, 9)}`],
    );
    await client.query(
      `INSERT INTO people (id, display_name, full_name, preferred_locale, directory_opt_in)
       VALUES ($1, 'Smoke Role User', 'Smoke Role User', 'en', false)`,
      [personId],
    );
    await client.query(
      `INSERT INTO organisation_users (id, church_id, user_account_id, person_id, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [id(), churchId, userId, personId],
    );
    await client.query(
      `INSERT INTO user_role_assignments (
         id, church_id, user_account_id, role_id, scope_type, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, 'church', $5, $5)`,
      [assignmentId, churchId, userId, roleId, actorId],
    );
    await client.query(
      `UPDATE user_role_assignments
       SET effective_to = now(), deleted_at = now(), updated_by = $2
       WHERE id = $1`,
      [assignmentId, actorId],
    );

    const check = await client.query(
      `SELECT r.code AS role_code,
              (SELECT count(*)::int FROM user_role_assignments a
                WHERE a.church_id = $1 AND a.deleted_at IS NULL) AS active_assignments,
              (SELECT count(*)::int FROM role_permissions rp WHERE rp.role_id = $2) AS permission_count
       FROM roles r
       WHERE r.id = $2`,
      [churchId, roleId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_ROLES_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_ROLES_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
