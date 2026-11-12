#!/usr/bin/env node
/**
 * Membership application DB smoke: create pending app → approve → membership active.
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
    const applicationId = id();
    const decisionId = id();
    const historyId = id();
    const today = new Date().toISOString().slice(0, 10);
    const suffix = personId.slice(0, 8);

    await client.query(
      `INSERT INTO people (id, display_name, full_name, preferred_locale, directory_opt_in)
       VALUES ($1, $2, $2, 'en', false)`,
      [personId, `Smoke Applicant ${suffix}`],
    );
    await client.query(
      `INSERT INTO memberships (
         id, church_id, person_id, membership_type, status, effective_from, created_by, updated_by
       ) VALUES ($1, $2, $3, 'individual', 'visitor', $4, $5, $5)`,
      [membershipId, churchId, personId, today, actorId],
    );
    await client.query(
      `INSERT INTO membership_applications (
         id, church_id, person_id, status, created_by, updated_by
       ) VALUES ($1, $2, $3, 'pending', $4, $4)`,
      [applicationId, churchId, personId, actorId],
    );
    await client.query(
      `INSERT INTO membership_decisions (id, application_id, decided_by_user_id, outcome, reason)
       VALUES ($1, $2, $3, 'approved', 'smoke ok')`,
      [decisionId, applicationId, actorId],
    );
    await client.query(
      `UPDATE membership_applications SET status = 'approved', updated_by = $2 WHERE id = $1`,
      [applicationId, actorId],
    );
    await client.query(
      `UPDATE memberships SET status = 'active', updated_by = $2 WHERE id = $1`,
      [membershipId, actorId],
    );
    await client.query(
      `INSERT INTO membership_status_history (
         id, membership_id, from_status, to_status, changed_by_user_id, reason
       ) VALUES ($1, $2, 'visitor', 'active', $3, 'application_approved')`,
      [historyId, membershipId, actorId],
    );

    const check = await client.query(
      `SELECT a.status AS application_status,
              d.outcome AS decision_outcome,
              m.status AS membership_status,
              h.to_status AS history_to
       FROM membership_applications a
       JOIN membership_decisions d ON d.application_id = a.id
       JOIN memberships m ON m.person_id = a.person_id AND m.church_id = a.church_id
       JOIN membership_status_history h ON h.membership_id = m.id AND h.to_status = 'active'
       WHERE a.id = $1`,
      [applicationId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_MEMBERSHIP_APPLICATIONS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_MEMBERSHIP_APPLICATIONS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
