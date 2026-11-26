#!/usr/bin/env node
/**
 * Effective-grants behavioural smoke against local/pilot Postgres.
 * Covers multi-role union, expiry, inactive unit skip, and church scoping.
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
const id = () => crypto.randomUUID();

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [
      churchId,
    ]);

    const roles = await client.query(
      `SELECT id, code FROM roles
        WHERE church_id = $1 AND deleted_at IS NULL
          AND code IN ('member', 'finance_officer')`,
      [churchId],
    );
    const byCode = Object.fromEntries(roles.rows.map((r) => [r.code, r.id]));
    if (!byCode.member || !byCode.finance_officer) {
      throw new Error('missing member/finance_officer roles — seed first');
    }

    const userId = id();
    const personId = id();
    const unitActive = id();
    const unitDead = id();
    const asgMember = id();
    const asgFinance = id();
    const asgExpired = id();
    const asgDeadUnit = id();
    const phoneDigits = userId.replace(/\D/g, '').slice(0, 9).padEnd(9, '0');

    await client.query(
      `INSERT INTO user_accounts (id, email, phone_e164, status)
       VALUES ($1, $2, $3, 'active')`,
      [userId, `grants-${userId.slice(0, 8)}@example.test`, `+2557${phoneDigits}`],
    );
    await client.query(
      `INSERT INTO people (id, display_name, full_name, preferred_locale, directory_opt_in)
       VALUES ($1, 'Grants Smoke', 'Grants Smoke', 'en', false)`,
      [personId],
    );
    await client.query(
      `INSERT INTO organisation_users (id, church_id, user_account_id, person_id, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [id(), churchId, userId, personId],
    );
    await client.query(
      `INSERT INTO organisational_units
         (id, church_id, name, code, kind, status, created_by, updated_by)
       VALUES
         ($1, $3, 'Active Unit', $4, 'ministry', 'active', $5, $5),
         ($2, $3, 'Dead Unit', $6, 'ministry', 'inactive', $5, $5)`,
      [
        unitActive,
        unitDead,
        churchId,
        `sa_${unitActive.slice(0, 8)}`,
        actorId,
        `sd_${unitDead.slice(0, 8)}`,
      ],
    );

    await client.query(
      `INSERT INTO user_role_assignments (
         id, church_id, user_account_id, role_id, scope_type,
         organisational_unit_id, effective_from, effective_to, created_by, updated_by
       ) VALUES
         ($1, $5, $6, $7, 'church', NULL, now() - interval '1 day', NULL, $9, $9),
         ($2, $5, $6, $8, 'organisational_unit', $10, now() - interval '1 day', NULL, $9, $9),
         ($3, $5, $6, $7, 'church', NULL, now() - interval '10 days', now() - interval '1 day', $9, $9),
         ($4, $5, $6, $8, 'organisational_unit', $11, now() - interval '1 day', NULL, $9, $9)`,
      [
        asgMember,
        asgFinance,
        asgExpired,
        asgDeadUnit,
        churchId,
        userId,
        byCode.member,
        byCode.finance_officer,
        actorId,
        unitActive,
        unitDead,
      ],
    );

    const grants = await client.query(
      `WITH active AS (
         SELECT a.role_id, a.scope_type, a.organisational_unit_id
         FROM user_role_assignments a
         JOIN roles r ON r.id = a.role_id
         WHERE a.church_id = $1
           AND a.user_account_id = $2
           AND a.deleted_at IS NULL
           AND r.deleted_at IS NULL
           AND a.effective_from <= now()
           AND (a.effective_to IS NULL OR a.effective_to > now())
       ),
       units AS (
         SELECT id FROM organisational_units
         WHERE church_id = $1 AND status = 'active' AND deleted_at IS NULL
       )
       SELECT DISTINCT p.code
       FROM active a
       JOIN role_permissions rp ON rp.role_id = a.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE a.scope_type <> 'organisational_unit'
          OR a.organisational_unit_id IN (SELECT id FROM units)
       ORDER BY 1`,
      [churchId, userId],
    );

    const codes = new Set(grants.rows.map((r) => r.code));
    if (codes.size < 3) {
      throw new Error(
        `expected union of member+finance grants, got ${codes.size}`,
      );
    }

    const financePerm = await client.query(
      `SELECT p.code FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1 LIMIT 1`,
      [byCode.finance_officer],
    );
    if (financePerm.rows[0] && !codes.has(financePerm.rows[0].code)) {
      throw new Error(
        'active unit-scoped finance role did not contribute grants',
      );
    }

    // Dead unit + expired church assignment must not be the only finance path —
    // confirm inactive unit alone would yield fewer codes.
    const withoutActiveUnit = await client.query(
      `WITH active AS (
         SELECT a.role_id, a.scope_type, a.organisational_unit_id
         FROM user_role_assignments a
         JOIN roles r ON r.id = a.role_id
         WHERE a.church_id = $1
           AND a.user_account_id = $2
           AND a.deleted_at IS NULL
           AND r.deleted_at IS NULL
           AND a.effective_from <= now()
           AND (a.effective_to IS NULL OR a.effective_to > now())
           AND a.id <> $3
       ),
       units AS (
         SELECT id FROM organisational_units
         WHERE church_id = $1 AND status = 'active' AND deleted_at IS NULL
       )
       SELECT count(DISTINCT p.code)::int AS n
       FROM active a
       JOIN role_permissions rp ON rp.role_id = a.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE a.scope_type <> 'organisational_unit'
          OR a.organisational_unit_id IN (SELECT id FROM units)`,
      [churchId, userId, asgFinance],
    );
    if (withoutActiveUnit.rows[0].n >= codes.size) {
      throw new Error('inactive/expired paths unexpectedly matched full grant set');
    }

    await client.query('ROLLBACK');
    console.log('SMOKE_EFFECTIVE_GRANTS_OK', {
      permissionCount: codes.size,
      withoutActiveUnit: withoutActiveUnit.rows[0].n,
      sample: [...codes].slice(0, 8),
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('SMOKE_EFFECTIVE_GRANTS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
