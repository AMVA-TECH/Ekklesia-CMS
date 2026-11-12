#!/usr/bin/env node
/**
 * Attendance progress / family DB smoke.
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

    const householdId = id();
    const childId = id();
    const eventId = id();
    const sessionId = id();
    const recordId = id();
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO households (
         id, church_id, label, created_by, updated_by
       ) VALUES ($1, $2, 'Smoke family', $3, $3)`,
      [householdId, churchId, actorId],
    );
    await client.query(
      `INSERT INTO household_members (
         id, household_id, person_id, relationship, is_primary_contact, created_by, updated_by
       ) VALUES ($1, $2, $3, 'member', true, $4, $4)`,
      [id(), householdId, personId, actorId],
    );
    await client.query(
      `INSERT INTO household_children (
         id, household_id, name, age, created_by, updated_by
       ) VALUES ($1, $2, 'Amina', 7, $3, $3)`,
      [childId, householdId, actorId],
    );
    await client.query(
      `INSERT INTO events (
         id, church_id, title, service_date, status, created_by, updated_by
       ) VALUES ($1, $2, 'Smoke Sunday', $3, 'scheduled', $4, $4)`,
      [eventId, churchId, today, actorId],
    );
    await client.query(
      `INSERT INTO attendance_sessions (
         id, church_id, event_id, mode, status, finalized_at, created_by, updated_by
       ) VALUES ($1, $2, $3, 'qr_mixed', 'finalized', now(), $4, $4)`,
      [sessionId, churchId, eventId, actorId],
    );
    await client.query(
      `INSERT INTO attendance_records (
         id, session_id, person_id, presence, source, created_by, updated_by
       ) VALUES ($1, $2, $3, 'present', 'qr', $4, $4)`,
      [recordId, sessionId, personId, actorId],
    );

    const check = await client.query(
      `SELECT h.label,
              (SELECT count(*)::int FROM household_children c WHERE c.household_id = h.id AND c.deleted_at IS NULL) AS children,
              (SELECT count(*)::int
                 FROM attendance_records ar
                 JOIN attendance_sessions s ON s.id = ar.session_id
                WHERE ar.person_id = $2
                  AND s.status = 'finalized'
                  AND ar.presence IN ('present','late')
                  AND ar.deleted_at IS NULL) AS present_sessions
       FROM households h
       WHERE h.id = $1`,
      [householdId, personId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_ATTENDANCE_PROGRESS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_ATTENDANCE_PROGRESS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
