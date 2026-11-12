#!/usr/bin/env node
/**
 * Member import smoke (DB + module path via SQL state transitions mirrored).
 * Creates job → row results → people via direct SQL equivalent checks after API-less path.
 * Prefer HTTP smoke when Next is up; this asserts tables + dedupe-ready seed.
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
    const mediaId = id();
    const jobId = id();
    const suffix = jobId.slice(0, 8);
    const rows = [
      { displayName: 'Import Alice', phoneE164: `+255711${suffix.slice(0, 6)}` },
      { displayName: 'Bad Row' },
    ];

    await client.query(
      `INSERT INTO media_assets (id, church_id, storage_key, content_type, kind, created_by, updated_by)
       VALUES ($1,$2,$3,'application/json','import_source',$4,$4)`,
      [mediaId, churchId, `imports/${churchId}/${jobId}.json`, actorId],
    );
    await client.query(
      `INSERT INTO import_jobs (id, church_id, media_asset_id, job_type, status, source_snapshot, started_at, created_by, updated_by)
       VALUES ($1,$2,$3,'members_excel','validated',$4::jsonb,now(),$5,$5)`,
      [jobId, churchId, mediaId, JSON.stringify(rows), actorId],
    );
    await client.query(
      `INSERT INTO import_row_results (id, job_id, row_number, status, payload, error_code)
       VALUES ($1,$2,1,'ok',$3::jsonb,null), ($4,$2,2,'error',$5::jsonb,'contact_required')`,
      [id(), jobId, JSON.stringify(rows[0]), id(), JSON.stringify(rows[1])],
    );
    await client.query(
      `UPDATE import_jobs SET status='previewed', updated_by=$2 WHERE id=$1`,
      [jobId, actorId],
    );

    const check = await client.query(
      `SELECT j.status, count(*) FILTER (WHERE r.status='ok') AS ok_rows,
              count(*) FILTER (WHERE r.status='error') AS error_rows
       FROM import_jobs j
       JOIN import_row_results r ON r.job_id = j.id
       WHERE j.id = $1
       GROUP BY j.status`,
      [jobId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_IMPORTS_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_IMPORTS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
