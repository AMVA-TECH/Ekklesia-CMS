#!/usr/bin/env node
/**
 * Stage 2 DB smoke (no Next server required).
 * Exercises create person → visitor membership → household using pg.
 * Usage: node scripts/smoke-stage2.mjs
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

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

function id() {
  return crypto.randomUUID();
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const personId = id();
    const membershipId = id();
    const householdId = id();
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO people (id, display_name, preferred_locale, directory_opt_in, created_by, updated_by)
       VALUES ($1, $2, 'en', false, $3, $3)`,
      [personId, 'Smoke Visitor', actorId],
    );
    await client.query(
      `INSERT INTO person_contacts (id, person_id, channel, value, is_primary, created_by, updated_by)
       VALUES ($1, $2, 'phone', $3, true, $4, $4)`,
      [id(), personId, '+255711000099', actorId],
    );
    await client.query(
      `INSERT INTO memberships (id, church_id, person_id, membership_type, status, effective_from, created_by, updated_by)
       VALUES ($1, $2, $3, 'individual', 'visitor', $4, $5, $5)`,
      [membershipId, churchId, personId, today, actorId],
    );
    await client.query(
      `INSERT INTO membership_status_history (id, membership_id, from_status, to_status, changed_by_user_id, reason)
       VALUES ($1, $2, null, 'visitor', $3, 'smoke create')`,
      [id(), membershipId, actorId],
    );
    await client.query(
      `UPDATE memberships SET status = 'active', updated_by = $2 WHERE id = $1 AND church_id = $3`,
      [membershipId, actorId, churchId],
    );
    await client.query(
      `INSERT INTO membership_status_history (id, membership_id, from_status, to_status, changed_by_user_id, reason)
       VALUES ($1, $2, 'visitor', 'active', $3, 'smoke activate')`,
      [id(), membershipId, actorId],
    );
    await client.query(
      `INSERT INTO households (id, church_id, label, created_by, updated_by)
       VALUES ($1, $2, 'Smoke Household', $3, $3)`,
      [householdId, churchId, actorId],
    );
    await client.query(
      `INSERT INTO household_members (id, household_id, person_id, relationship, is_primary_contact, created_by, updated_by)
       VALUES ($1, $2, $3, 'member', true, $4, $4)`,
      [id(), householdId, personId, actorId],
    );
    await client.query(
      `INSERT INTO household_children (id, household_id, name, age, created_by, updated_by)
       VALUES ($1, $2, 'Smoke Child', 7, $3, $3)`,
      [id(), householdId, actorId],
    );

    const { rows } = await client.query(
      `SELECT p.display_name, m.status, h.label, c.name AS child
       FROM people p
       JOIN memberships m ON m.person_id = p.id AND m.church_id = $2
       JOIN household_members hm ON hm.person_id = p.id
       JOIN households h ON h.id = hm.household_id AND h.church_id = $2
       JOIN household_children c ON c.household_id = h.id
       WHERE p.id = $1`,
      [personId, churchId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_OK', JSON.stringify(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('SMOKE_FAIL', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
