#!/usr/bin/env node
/**
 * Churches / settings DB smoke.
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
const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);

    await client.query(
      `UPDATE churches SET timezone = 'Africa/Dar_es_Salaam', updated_by = $2 WHERE id = $1`,
      [churchId, actorId],
    );
    await client.query(
      `UPDATE church_settings
       SET settings = coalesce(settings, '{}'::jsonb) || '{"attendanceConsistentMin":0.8}'::jsonb,
           updated_by = $2
       WHERE church_id = $1`,
      [churchId, actorId],
    );

    const check = await client.query(
      `SELECT c.name, c.timezone, c.default_locale,
              s.settings->>'attendanceConsistentMin' AS band
       FROM churches c
       JOIN church_settings s ON s.church_id = c.id
       WHERE c.id = $1`,
      [churchId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_CHURCHES_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_CHURCHES_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
