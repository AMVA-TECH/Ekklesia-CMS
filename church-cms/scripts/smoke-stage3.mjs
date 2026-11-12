#!/usr/bin/env node
/**
 * Stage 3 DB smoke (no Next server required).
 * unit → participation → event → attendance session (headcount) → finalize.
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

function id() {
  return crypto.randomUUID();
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const unitId = id();
    const participationId = id();
    const eventTypeId = id();
    const eventId = id();
    const sessionId = id();
    const summaryId = id();
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO organisational_units (id, church_id, kind, name, status, created_by, updated_by)
       VALUES ($1, $2, 'ministry', 'Smoke Youth Ministry', 'active', $3, $3)`,
      [unitId, churchId, actorId],
    );
    await client.query(
      `INSERT INTO participations (id, church_id, organisational_unit_id, person_id, role_in_unit, effective_from, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, 'member', $5, 'active', $6, $6)`,
      [participationId, churchId, unitId, personId, today, actorId],
    );
    await client.query(
      `INSERT INTO event_types (id, church_id, code, name, created_by, updated_by)
       VALUES ($1, $2, $3, 'Sunday Service', $4, $4)`,
      [eventTypeId, churchId, `smoke_svc_${eventTypeId.slice(0, 8)}`, actorId],
    );
    await client.query(
      `INSERT INTO events (id, church_id, event_type_id, organisational_unit_id, title, service_date, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, 'Smoke Sunday', $5, 'scheduled', $6, $6)`,
      [eventId, churchId, eventTypeId, unitId, today, actorId],
    );
    await client.query(
      `INSERT INTO attendance_sessions (id, church_id, event_id, mode, status, created_by, updated_by)
       VALUES ($1, $2, $3, 'headcount', 'open', $4, $4)`,
      [sessionId, churchId, eventId, actorId],
    );
    await client.query(
      `INSERT INTO attendance_summaries (id, session_id, men_count, women_count, children_count, visitors_count, total_count, created_by, updated_by)
       VALUES ($1, $2, 10, 12, 5, 3, 30, $3, $3)`,
      [summaryId, sessionId, actorId],
    );
    await client.query(
      `UPDATE attendance_sessions SET status = 'finalized', finalized_at = now(), updated_by = $2 WHERE id = $1`,
      [sessionId, actorId],
    );

    const check = await client.query(
      `SELECT u.name AS unit, p.status AS participation, e.title, s.status AS session_status, sum.total_count
       FROM organisational_units u
       JOIN participations p ON p.organisational_unit_id = u.id
       JOIN events e ON e.organisational_unit_id = u.id
       JOIN attendance_sessions s ON s.event_id = e.id
       JOIN attendance_summaries sum ON sum.session_id = s.id
       WHERE u.id = $1`,
      [unitId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_STAGE3_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_STAGE3_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
