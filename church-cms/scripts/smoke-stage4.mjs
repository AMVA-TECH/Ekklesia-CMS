#!/usr/bin/env node
/**
 * Stage 4 DB smoke: fund → accounts → year → balanced journal post → offering → template → announcement.
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
    const fundId = id();
    const cashId = id();
    const incomeId = id();
    const yearId = id();
    const journalId = id();
    const offeringId = id();
    const templateId = id();
    const announcementId = id();
    const today = new Date().toISOString().slice(0, 10);
    const suffix = fundId.slice(0, 8);

    await client.query(
      `INSERT INTO funds (id, church_id, code, name, fund_type, created_by, updated_by)
       VALUES ($1,$2,$3,'General Fund','unrestricted',$4,$4)`,
      [fundId, churchId, `GEN_${suffix}`, actorId],
    );
    await client.query(
      `INSERT INTO accounts (id, church_id, code, name, account_type, created_by, updated_by)
       VALUES ($1,$2,$3,'Cash','asset',$4,$4), ($5,$2,$6,'Tithe Income','income',$4,$4)`,
      [cashId, churchId, `1000_${suffix}`, actorId, incomeId, `4000_${suffix}`],
    );
    await client.query(
      `INSERT INTO financial_years (id, church_id, label, starts_on, ends_on, status, created_by, updated_by)
       VALUES ($1,$2,$3,'2026-01-01','2026-12-31','open',$4,$4)`,
      [yearId, churchId, `FY2026_${suffix}`, actorId],
    );
    await client.query(
      `INSERT INTO journals (id, church_id, financial_year_id, entry_number, journal_date, status, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,'draft',$6,$6)`,
      [journalId, churchId, yearId, `JE-${suffix}`, today, actorId],
    );
    await client.query(
      `INSERT INTO journal_lines (id, journal_id, account_id, fund_id, debit_minor, credit_minor, created_by, updated_by)
       VALUES ($1,$2,$3,$4,50000,0,$5,$5), ($6,$2,$7,$4,0,50000,$5,$5)`,
      [id(), journalId, cashId, fundId, actorId, id(), incomeId],
    );
    await client.query(
      `UPDATE journals SET status='posted', posted_at=now(), updated_by=$2 WHERE id=$1`,
      [journalId, actorId],
    );
    await client.query(
      `INSERT INTO offerings (id, church_id, service_date, fund_id, amount_minor, currency, journal_id, created_by, updated_by)
       VALUES ($1,$2,$3,$4,50000,'TZS',$5,$6,$6)`,
      [offeringId, churchId, today, fundId, journalId, actorId],
    );
    await client.query(
      `INSERT INTO message_templates (id, church_id, code, channel, locale, body, created_by, updated_by)
       VALUES ($1,$2,$3,'sms','sw','Karibu ibada',$4,$4)`,
      [templateId, churchId, `welcome_${suffix}`, actorId],
    );
    await client.query(
      `INSERT INTO announcements (id, church_id, title, body, status, published_at, created_by, updated_by)
       VALUES ($1,$2,'Smoke Notice','Body','published',now(),$3,$3)`,
      [announcementId, churchId, actorId],
    );

    const check = await client.query(
      `SELECT f.code AS fund, j.status AS journal_status,
              (SELECT sum(debit_minor) FROM journal_lines WHERE journal_id=$1) AS debit,
              (SELECT sum(credit_minor) FROM journal_lines WHERE journal_id=$1) AS credit,
              o.amount_minor, t.code AS template, a.status AS announcement
       FROM funds f
       JOIN journals j ON j.church_id = f.church_id AND j.id = $1
       JOIN offerings o ON o.journal_id = j.id
       JOIN message_templates t ON t.id = $2
       JOIN announcements a ON a.id = $3
       WHERE f.id = $4`,
      [journalId, templateId, announcementId, fundId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_STAGE4_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_STAGE4_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
