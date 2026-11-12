#!/usr/bin/env node
/**
 * Multi-role seed fixtures smoke.
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

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('app.church_id', $1, true)`, [churchId]);
    const check = await client.query(
      `SELECT r.code,
              count(rp.permission_id)::int AS perms,
              (SELECT u.email FROM user_accounts u
                 JOIN user_role_assignments a ON a.user_account_id = u.id
                WHERE a.role_id = r.id AND a.deleted_at IS NULL
                LIMIT 1) AS sample_email
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       WHERE r.church_id = $1
         AND r.code IN ('church_administrator', 'member', 'finance_officer')
         AND r.deleted_at IS NULL
       GROUP BY r.id, r.code
       ORDER BY r.code`,
      [churchId],
    );
    const codes = new Set(check.rows.map((r) => r.code));
    for (const needed of ['church_administrator', 'member', 'finance_officer']) {
      if (!codes.has(needed)) throw new Error(`missing role ${needed}`);
    }
    const member = check.rows.find((r) => r.code === 'member');
    const finance = check.rows.find((r) => r.code === 'finance_officer');
    if (!member || member.perms < 5) throw new Error('member permissions too few');
    if (!finance || finance.perms < 5) throw new Error('finance_officer permissions too few');
    console.log('SMOKE_ROLE_FIXTURES_OK', check.rows);
  } catch (error) {
    console.error('SMOKE_ROLE_FIXTURES_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
