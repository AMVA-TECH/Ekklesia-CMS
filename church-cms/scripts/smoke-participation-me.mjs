#!/usr/bin/env node
/**
 * Participation requests (self) + announcement reject approval linkage smoke.
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
const personId = 'dddddddd-0001-0001-0001-000000000001';
const id = () => crypto.randomUUID();
const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);

    const unit = await client.query(
      `SELECT id FROM organisational_units
       WHERE church_id = $1 AND deleted_at IS NULL
       ORDER BY created_at LIMIT 1`,
      [churchId],
    );
    const unitId = unit.rows[0]?.id;
    if (!unitId) throw new Error('seed organisational unit missing');

    const requestId = id();
    await client.query(
      `INSERT INTO participation_requests (
         id, church_id, organisational_unit_id, person_id, status, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, 'pending', $5, $5)`,
      [requestId, churchId, unitId, personId, actorId],
    );

    const announcementId = id();
    const approvalId = id();
    await client.query(
      `INSERT INTO announcements (
         id, church_id, title, body, status, created_by, updated_by
       ) VALUES ($1, $2, 'Reject smoke', 'Body', 'pending_approval', $3, $3)`,
      [announcementId, churchId, actorId],
    );
    await client.query(
      `INSERT INTO approval_requests (
         id, church_id, subject_type, subject_id, requested_by_user_id, status, current_step, created_by, updated_by
       ) VALUES ($1, $2, 'announcement', $3, $4, 'pending', 1, $4, $4)`,
      [approvalId, churchId, announcementId, actorId],
    );
    await client.query(
      `UPDATE announcements SET status = 'rejected', updated_by = $2 WHERE id = $1`,
      [announcementId, actorId],
    );
    await client.query(
      `UPDATE approval_requests SET status = 'rejected', updated_by = $2 WHERE id = $1`,
      [approvalId, actorId],
    );

    const check = await client.query(
      `SELECT
         (SELECT count(*)::int FROM participation_requests
           WHERE person_id = $1 AND church_id = $2 AND deleted_at IS NULL) AS my_requests,
         (SELECT status FROM announcements WHERE id = $3) AS announcement_status,
         (SELECT status FROM approval_requests WHERE id = $4) AS approval_status`,
      [personId, churchId, announcementId, approvalId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_PARTICIPATION_ME_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_PARTICIPATION_ME_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
