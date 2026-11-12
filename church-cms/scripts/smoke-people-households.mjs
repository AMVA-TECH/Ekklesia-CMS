#!/usr/bin/env node
/**
 * People contacts + household list/patch DB smoke.
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
    const contactId = id();
    const email = `smoke+${contactId.slice(0, 8)}@example.com`;

    await client.query(
      `INSERT INTO person_contacts (
         id, person_id, channel, value, is_primary, created_by, updated_by
       ) VALUES ($1, $2, 'email', $3, false, $4, $4)`,
      [contactId, personId, email, actorId],
    );

    await client.query(
      `INSERT INTO households (
         id, church_id, label, shared_address, created_by, updated_by
       ) VALUES ($1, $2, 'Contacts smoke HH', 'Old Rd', $3, $3)`,
      [householdId, churchId, actorId],
    );
    await client.query(
      `UPDATE households
       SET label = 'Contacts smoke HH updated',
           shared_address = 'New Rd',
           emergency_contact_phone = '+255700000001',
           updated_by = $2
       WHERE id = $1 AND church_id = $3`,
      [householdId, actorId, churchId],
    );

    const check = await client.query(
      `SELECT
         (SELECT count(*)::int FROM person_contacts
           WHERE person_id = $1 AND channel = 'email' AND value = $2 AND deleted_at IS NULL) AS emails,
         (SELECT label FROM households WHERE id = $3) AS household_label,
         (SELECT shared_address FROM households WHERE id = $3) AS address
      `,
      [personId, email, householdId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_PEOPLE_HOUSEHOLDS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_PEOPLE_HOUSEHOLDS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
