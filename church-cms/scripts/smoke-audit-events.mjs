#!/usr/bin/env node
/**
 * Audit events DB smoke: insert high-impact rows and query filters.
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

    const auditId = id();
    const entityId = id();
    await client.query(
      `INSERT INTO audit_events (
         id, church_id, actor_user_id, action, entity_type, entity_id, metadata
       ) VALUES (
         $1, $2, $3, 'governance.approval.approve', 'approval_request', $4,
         '{"subjectType":"expense","amountMinor":150000,"note":"ok"}'::jsonb
       )`,
      [auditId, churchId, actorId, entityId],
    );

    const check = await client.query(
      `SELECT action, entity_type, metadata->>'subjectType' AS subject_type
       FROM audit_events
       WHERE id = $1 AND church_id = $2`,
      [auditId, churchId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_AUDIT_EVENTS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_AUDIT_EVENTS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
