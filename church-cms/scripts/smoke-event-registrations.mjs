#!/usr/bin/env node
/**
 * Event registration DB smoke: register → cancel → re-register.
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

    const eventId = id();
    const registrationId = id();
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO events (
         id, church_id, title, service_date, status, created_by, updated_by
       ) VALUES ($1, $2, 'Smoke registration event', $3, 'scheduled', $4, $4)`,
      [eventId, churchId, today, actorId],
    );
    await client.query(
      `INSERT INTO event_registrations (
         id, event_id, person_id, status, created_by, updated_by
       ) VALUES ($1, $2, $3, 'registered', $4, $4)`,
      [registrationId, eventId, personId, actorId],
    );
    await client.query(
      `UPDATE event_registrations SET status = 'cancelled', updated_by = $2 WHERE id = $1`,
      [registrationId, actorId],
    );
    await client.query(
      `UPDATE event_registrations SET status = 'registered', updated_by = $2 WHERE id = $1`,
      [registrationId, actorId],
    );

    const check = await client.query(
      `SELECT e.title, r.status, r.person_id = $2 AS is_self
       FROM events e
       JOIN event_registrations r ON r.event_id = e.id
       WHERE e.id = $1`,
      [eventId, personId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_EVENT_REGISTRATIONS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_EVENT_REGISTRATIONS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
