#!/usr/bin/env node
/**
 * Memberships list/create/status DB smoke.
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
const id = () => crypto.randomUUID();
const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);

    const personId = id();
    const membershipId = id();
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO people (id, display_name, preferred_locale, directory_opt_in, created_by, updated_by)
       VALUES ($1, 'Smoke Member Create', 'en', false, $2, $2)`,
      [personId, actorId],
    );
    await client.query(
      `INSERT INTO memberships (
         id, church_id, person_id, membership_type, status, effective_from, created_by, updated_by
       ) VALUES ($1, $2, $3, 'individual', 'visitor', $4, $5, $5)`,
      [membershipId, churchId, personId, today, actorId],
    );
    await client.query(
      `INSERT INTO membership_status_history (
         id, membership_id, from_status, to_status, changed_by_user_id, reason
       ) VALUES ($1, $2, null, 'visitor', $3, 'created')`,
      [id(), membershipId, actorId],
    );
    await client.query(
      `UPDATE memberships SET status = 'active', updated_by = $2 WHERE id = $1 AND church_id = $3`,
      [membershipId, actorId, churchId],
    );
    await client.query(
      `INSERT INTO membership_status_history (
         id, membership_id, from_status, to_status, changed_by_user_id, reason
       ) VALUES ($1, $2, 'visitor', 'active', $3, 'smoke activate')`,
      [id(), membershipId, actorId],
    );

    const check = await client.query(
      `SELECT m.status,
              (SELECT count(*)::int FROM membership_status_history h WHERE h.membership_id = m.id) AS history_rows,
              (SELECT count(*)::int FROM memberships x
                WHERE x.church_id = $1 AND x.deleted_at IS NULL) AS church_memberships
       FROM memberships m
       WHERE m.id = $2`,
      [churchId, membershipId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_MEMBERSHIPS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_MEMBERSHIPS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
