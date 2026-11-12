#!/usr/bin/env node
/**
 * Leadership text blast DB smoke (no Next server).
 * Creates a queued SMS job + pending delivery for the seed admin person.
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

    const existingPhone = await client.query(
      `SELECT 1 FROM person_contacts WHERE person_id=$1 AND channel='phone' AND deleted_at IS NULL LIMIT 1`,
      [personId],
    );
    if (existingPhone.rowCount === 0) {
      await client.query(
        `INSERT INTO person_contacts (id, person_id, channel, value, is_primary, created_by, updated_by)
         VALUES ($1, $2, 'phone', '+255700000001', true, $3, $3)`,
        [id(), personId, actorId],
      );
    }

    const jobId = id();
    const deliveryId = id();
    await client.query(
      `INSERT INTO message_jobs (
         id, church_id, channel, title, body, audience_type, status, created_by, updated_by
       ) VALUES ($1, $2, 'sms', 'Sunday reminder', 'Huduma kesho saa 10 asubuhi. Karibuni!', 'all_members', 'queued', $3, $3)`,
      [jobId, churchId, actorId],
    );
    await client.query(
      `INSERT INTO message_deliveries (
         id, job_id, person_id, channel, to_address, status, created_by, updated_by
       ) VALUES ($1, $2, $3, 'sms', '+255700000001', 'pending', $4, $4)`,
      [deliveryId, jobId, personId, actorId],
    );

    const check = await client.query(
      `SELECT j.title, j.body, j.status, j.created_by, count(d.*) AS deliveries
       FROM message_jobs j
       JOIN message_deliveries d ON d.job_id = j.id
       WHERE j.id = $1
       GROUP BY j.title, j.body, j.status, j.created_by`,
      [jobId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_BLASTS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_BLASTS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
