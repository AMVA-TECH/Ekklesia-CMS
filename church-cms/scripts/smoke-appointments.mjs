#!/usr/bin/env node
/**
 * Positions + appointments DB smoke (no Next server).
 * position → appoint person → end appointment + history.
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
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);

    const positionId = id();
    const appointmentId = id();
    const historyAppointedId = id();
    const historyEndedId = id();
    const code = `smoke_pos_${positionId.slice(0, 8)}`;
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO positions (id, church_id, code, title, created_by, updated_by)
       VALUES ($1, $2, $3, 'Smoke Ministry Leader', $4, $4)`,
      [positionId, churchId, code, actorId],
    );
    await client.query(
      `INSERT INTO appointments (
         id, church_id, position_id, person_id, effective_from, status, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)`,
      [appointmentId, churchId, positionId, personId, today, actorId],
    );
    await client.query(
      `INSERT INTO appointment_history (id, appointment_id, change_type, changed_by_user_id)
       VALUES ($1, $2, 'appointed', $3)`,
      [historyAppointedId, appointmentId, actorId],
    );
    await client.query(
      `UPDATE appointments
       SET status = 'ended', effective_to = $2, updated_by = $3, updated_at = now()
       WHERE id = $1`,
      [appointmentId, today, actorId],
    );
    await client.query(
      `INSERT INTO appointment_history (id, appointment_id, change_type, changed_by_user_id, reason)
       VALUES ($1, $2, 'ended', $3, 'smoke end')`,
      [historyEndedId, appointmentId, actorId],
    );

    const check = await client.query(
      `SELECT p.code, a.status, count(h.*) AS history_rows
       FROM positions p
       JOIN appointments a ON a.position_id = p.id
       JOIN appointment_history h ON h.appointment_id = a.id
       WHERE p.id = $1
       GROUP BY p.code, a.status`,
      [positionId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_APPOINTMENTS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_APPOINTMENTS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
