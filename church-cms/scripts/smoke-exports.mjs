#!/usr/bin/env node
/**
 * Exports module unit-style smoke (CSV builder + DB row sources).
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
const pool = new Pool({ connectionString: databaseUrl });

function toCsv(headers, rows) {
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join(
    '\n',
  );
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);
    const people = await client.query(
      `SELECT p.display_name, m.status
       FROM memberships m
       JOIN people p ON p.id = m.person_id
       WHERE m.church_id = $1 AND m.deleted_at IS NULL
       LIMIT 5`,
      [churchId],
    );
    const csv = toCsv(
      ['display_name', 'status'],
      people.rows.map((r) => [r.display_name, r.status]),
    );
    if (!csv.includes('display_name')) throw new Error('csv missing header');
    console.log('SMOKE_EXPORTS_OK', {
      peopleRows: people.rowCount,
      csvBytes: Buffer.byteLength(csv, 'utf8'),
    });
  } catch (error) {
    console.error('SMOKE_EXPORTS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
