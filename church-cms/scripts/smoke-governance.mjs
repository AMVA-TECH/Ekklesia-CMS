#!/usr/bin/env node
/**
 * Leadership governance DB smoke:
 * expense dual-control, announcement approval + audiences, delegation,
 * budget periods, appointment request, meeting minutes, saved custom report view.
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
const requesterId = 'cccccccc-0001-0001-0001-000000000001';
const approverId = 'cccccccc-0001-0001-0001-000000000002';

function id() {
  return crypto.randomUUID();
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);

    await client.query(
      `INSERT INTO user_accounts (id, email, phone_e164, status)
       VALUES ($1, 'approver@example.test', '+255700000002', 'active')
       ON CONFLICT DO NOTHING`,
      [approverId],
    );

    const expenseId = id();
    const approvalId = id();
    const actionId = id();
    const delegationId = id();
    const fyId = id();
    const accountId = id();
    const budgetId = id();
    const lineId = id();
    const positionId = id();
    const personId = id();
    const apptReqId = id();
    const minutesId = id();
    const savedId = id();
    const announcementId = id();
    const annAudienceId = id();
    const annApprovalId = id();
    const annActionId = id();
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO expenses (
         id, church_id, amount_minor, currency, expense_date, purpose, status, created_by, updated_by
       ) VALUES ($1, $2, 150000, 'TZS', $3, 'Smoke PA system hire', 'pending_approval', $4, $4)`,
      [expenseId, churchId, today, requesterId],
    );
    await client.query(
      `INSERT INTO approval_requests (
         id, church_id, subject_type, subject_id, requested_by_user_id, status, created_by, updated_by
       ) VALUES ($1, $2, 'expense', $3, $4, 'pending', $4, $4)`,
      [approvalId, churchId, expenseId, requesterId],
    );
    await client.query(
      `INSERT INTO approval_actions (id, approval_request_id, actor_user_id, action, note)
       VALUES ($1, $2, $3, 'approve', 'smoke ok')`,
      [actionId, approvalId, approverId],
    );
    await client.query(
      `UPDATE approval_requests SET status = 'approved', updated_by = $2 WHERE id = $1`,
      [approvalId, approverId],
    );
    await client.query(
      `UPDATE expenses SET status = 'approved', updated_by = $2 WHERE id = $1`,
      [expenseId, approverId],
    );
    await client.query(
      `INSERT INTO delegations (
         id, church_id, delegator_user_id, delegate_user_id, grants,
         effective_from, status, reason, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5::jsonb, now(), 'active', 'SP away smoke', $3, $3)`,
      [
        delegationId,
        churchId,
        requesterId,
        approverId,
        JSON.stringify(['memberships:approve', 'disbursements:approve']),
      ],
    );

    await client.query(
      `INSERT INTO financial_years (id, church_id, label, starts_on, ends_on, status, created_by, updated_by)
       VALUES ($1, $2, $3, '2026-01-01', '2026-12-31', 'open', $4, $4)`,
      [fyId, churchId, `Smoke FY ${fyId.slice(0, 8)}`, requesterId],
    );
    await client.query(
      `INSERT INTO accounts (
         id, church_id, code, name, account_type, created_by, updated_by
       ) VALUES ($1, $2, $3, 'Smoke Expense', 'expense', $4, $4)`,
      [accountId, churchId, `SMK-${accountId.slice(0, 6)}`, requesterId],
    );
    await client.query(
      `INSERT INTO budgets (
         id, church_id, financial_year_id, name, period_kind, period_key,
         starts_on, ends_on, status, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, 'quarterly', '2026-Q1', '2026-01-01', '2026-03-31', 'draft', $5, $5)`,
      [budgetId, churchId, fyId, `Smoke Q1 ${budgetId.slice(0, 8)}`, requesterId],
    );
    await client.query(
      `INSERT INTO budget_lines (id, budget_id, account_id, amount_minor, created_by, updated_by)
       VALUES ($1, $2, $3, 5000000, $4, $4)`,
      [lineId, budgetId, accountId, requesterId],
    );

    await client.query(
      `INSERT INTO positions (id, church_id, code, title, created_by, updated_by)
       VALUES ($1, $2, $3, 'Smoke Deacon', $4, $4)`,
      [positionId, churchId, `SMOKE_POS_${positionId.slice(0, 8)}`, requesterId],
    );
    await client.query(
      `INSERT INTO people (id, display_name, created_by, updated_by)
       VALUES ($1, 'Smoke Nominee', $2, $2)`,
      [personId, requesterId],
    );
    await client.query(
      `INSERT INTO appointment_requests (
         id, church_id, position_id, person_id, requested_by_user_id, status, reason, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, 'pending', 'smoke nominate', $5, $5)`,
      [apptReqId, churchId, positionId, personId, requesterId],
    );

    await client.query(
      `INSERT INTO meeting_minutes (
         id, church_id, title, meeting_date, body, attendees, status, created_by, updated_by
       ) VALUES ($1, $2, 'Smoke elders meeting', $3, 'Opened in prayer. Approved Q1 budget.', '[]'::jsonb, 'draft', $4, $4)`,
      [minutesId, churchId, today, requesterId],
    );

    await client.query(
      `INSERT INTO saved_reports (
         id, church_id, name, report_id, filters, created_by_user_id, created_by, updated_by
       ) VALUES ($1, $2, $3, 'R-SP-05', '{"from":"2026-01-01","to":"2026-12-31"}'::jsonb, $4, $4, $4)`,
      [savedId, churchId, `Smoke moneyflow ${savedId.slice(0, 8)}`, requesterId],
    );

    await client.query(
      `INSERT INTO announcements (
         id, church_id, title, body, status, created_by, updated_by
       ) VALUES ($1, $2, 'Smoke church-wide notice', 'Body', 'pending_approval', $3, $3)`,
      [announcementId, churchId, requesterId],
    );
    await client.query(
      `INSERT INTO announcement_audiences (id, announcement_id, audience_type)
       VALUES ($1, $2, 'all_members')`,
      [annAudienceId, announcementId],
    );
    await client.query(
      `INSERT INTO approval_requests (
         id, church_id, subject_type, subject_id, requested_by_user_id, status, created_by, updated_by
       ) VALUES ($1, $2, 'announcement', $3, $4, 'pending', $4, $4)`,
      [annApprovalId, churchId, announcementId, requesterId],
    );
    await client.query(
      `INSERT INTO approval_actions (id, approval_request_id, actor_user_id, action, note)
       VALUES ($1, $2, $3, 'approve', 'ann smoke ok')`,
      [annActionId, annApprovalId, approverId],
    );
    await client.query(
      `UPDATE approval_requests SET status = 'approved', updated_by = $2 WHERE id = $1`,
      [annApprovalId, approverId],
    );
    await client.query(
      `UPDATE announcements SET status = 'published', published_at = now(), updated_by = $2 WHERE id = $1`,
      [announcementId, approverId],
    );

    const check = await client.query(
      `SELECT e.status AS expense_status,
              a.status AS approval_status,
              d.status AS delegation_status,
              b.period_kind, b.period_key,
              ar.status AS appointment_request_status,
              mm.status AS minutes_status,
              sr.report_id AS saved_report_id,
              an.status AS announcement_status,
              aa.audience_type AS announcement_audience,
              ann_ar.status AS announcement_approval_status
       FROM expenses e
       JOIN approval_requests a ON a.subject_id = e.id AND a.subject_type = 'expense'
       JOIN delegations d ON d.id = $2
       JOIN budgets b ON b.id = $3
       JOIN appointment_requests ar ON ar.id = $4
       JOIN meeting_minutes mm ON mm.id = $5
       JOIN saved_reports sr ON sr.id = $6
       JOIN announcements an ON an.id = $7
       JOIN announcement_audiences aa ON aa.announcement_id = an.id
       JOIN approval_requests ann_ar ON ann_ar.subject_id = an.id AND ann_ar.subject_type = 'announcement'
       WHERE e.id = $1`,
      [expenseId, delegationId, budgetId, apptReqId, minutesId, savedId, announcementId],
    );

    await client.query('COMMIT');
    console.log('SMOKE_GOVERNANCE_OK', check.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SMOKE_GOVERNANCE_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
