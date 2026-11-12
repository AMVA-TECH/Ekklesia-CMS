#!/usr/bin/env node
/**
 * Journal reverse + financial year close DB smoke.
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

    const yearId = id();
    const incomeId = id();
    const cashId = id();
    const journalId = id();
    const reversalId = id();
    const today = new Date().toISOString().slice(0, 10);
    const suffix = journalId.slice(0, 8);

    await client.query(
      `INSERT INTO financial_years (
         id, church_id, label, starts_on, ends_on, status, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $4, 'open', $5, $5)`,
      [yearId, churchId, `Smoke FY ${suffix}`, today, actorId],
    );
    await client.query(
      `INSERT INTO accounts (
         id, church_id, code, name, account_type, status, created_by, updated_by
       ) VALUES
         ($1, $3, $4, 'Smoke Income', 'income', 'active', $5, $5),
         ($2, $3, $6, 'Smoke Cash', 'asset', 'active', $5, $5)`,
      [incomeId, cashId, churchId, `INC-${suffix}`, actorId, `CASH-${suffix}`],
    );
    await client.query(
      `INSERT INTO journals (
         id, church_id, financial_year_id, entry_number, journal_date, memo,
         status, posted_at, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, 'Smoke posting', 'posted', now(), $6, $6)`,
      [journalId, churchId, yearId, `J-${suffix}`, today, actorId],
    );
    await client.query(
      `INSERT INTO journal_lines (
         id, journal_id, account_id, debit_minor, credit_minor, currency, created_by, updated_by
       ) VALUES
         ($1, $3, $4, 1000, 0, 'TZS', $5, $5),
         ($2, $3, $6, 0, 1000, 'TZS', $5, $5)`,
      [id(), id(), journalId, cashId, actorId, incomeId],
    );
    await client.query(
      `INSERT INTO journals (
         id, church_id, financial_year_id, entry_number, journal_date, memo,
         reverses_entry_id, status, posted_at, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'posted', now(), $8, $8)`,
      [
        reversalId,
        churchId,
        yearId,
        `J-${suffix}-R`,
        today,
        `Reversal of J-${suffix}`,
        journalId,
        actorId,
      ],
    );
    await client.query(
      `INSERT INTO journal_lines (
         id, journal_id, account_id, debit_minor, credit_minor, currency, created_by, updated_by
       ) VALUES
         ($1, $3, $4, 0, 1000, 'TZS', $5, $5),
         ($2, $3, $6, 1000, 0, 'TZS', $5, $5)`,
      [id(), id(), reversalId, cashId, actorId, incomeId],
    );
    await client.query(
      `UPDATE journals SET status = 'reversed', updated_by = $2 WHERE id = $1`,
      [journalId, actorId],
    );
    await client.query(
      `UPDATE financial_years SET status = 'closed', updated_by = $2 WHERE id = $1`,
      [yearId, actorId],
    );

    const check = await client.query(
      `SELECT j.status AS original_status,
              r.status AS reversal_status,
              r.reverses_entry_id = j.id AS linked,
              y.status AS year_status
       FROM journals j
       JOIN journals r ON r.reverses_entry_id = j.id
       JOIN financial_years y ON y.id = j.financial_year_id
       WHERE j.id = $1`,
      [journalId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_JOURNAL_REVERSE_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_JOURNAL_REVERSE_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
