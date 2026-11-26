#!/usr/bin/env node
/**
 * Cross-tenant isolation smoke for core RLS tenant tables.
 * Verifies FORCE RLS hides other churches when app.church_id is set
 * (as a non-BYPASSRLS role), and that church_id predicates return empty
 * for foreign tenants.
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

/** Keep in sync with src/platform/db/rls.sql.ts TENANT_TABLES_FOR_RLS */
const TENANT_TABLES = [
  'church_settings',
  'organisation_users',
  'households',
  'memberships',
  'membership_applications',
  'roles',
  'user_role_assignments',
  'media_assets',
  'audit_events',
  'idempotency_keys',
  'domain_event_outbox',
];

const churchA = '11111111-1111-1111-1111-111111111111';
const churchB = '22222222-2222-2222-2222-222222222222';
const appRole = process.env.DATABASE_APP_ROLE || 'church_cms_app';
const pool = new Pool({ connectionString: databaseUrl });

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const predicateResults = {};
    for (const table of TENANT_TABLES) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      if (!exists.rowCount) {
        predicateResults[table] = 'missing';
        continue;
      }
      const hasChurchId = await client.query(
        `SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'church_id'`,
        [table],
      );
      if (!hasChurchId.rowCount) {
        predicateResults[table] = 'no_church_id';
        continue;
      }
      const deletedCol = await client.query(
        `SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'deleted_at'`,
        [table],
      );
      const sql = deletedCol.rowCount
        ? `SELECT count(*)::int AS n FROM ${quoteIdent(table)} WHERE church_id = $1 AND deleted_at IS NULL`
        : `SELECT count(*)::int AS n FROM ${quoteIdent(table)} WHERE church_id = $1`;
      const predicate = await client.query(sql, [churchB]);
      if (predicate.rows[0].n !== 0) {
        throw new Error(
          `${table}: church_id predicate returned ${predicate.rows[0].n} foreign rows`,
        );
      }
      predicateResults[table] = 0;
    }

    const bypass = await client.query(
      `SELECT current_user AS usr, rolbypassrls
         FROM pg_roles WHERE rolname = current_user`,
    );
    let rlsChecked = false;
    const rlsHome = {};

    if (bypass.rows[0]?.rolbypassrls) {
      const roleExists = await client.query(
        `SELECT 1 FROM pg_roles WHERE rolname = $1 AND NOT rolbypassrls AND NOT rolsuper`,
        [appRole],
      );
      if (roleExists.rowCount > 0) {
        const ident = quoteIdent(appRole);
        await client.query(
          `GRANT SELECT ON ${TENANT_TABLES.map(quoteIdent).join(', ')} TO ${ident}`,
        );
        await client.query(`SET LOCAL ROLE ${ident}`);
      } else {
        console.warn(
          'SMOKE_RBAC_ISOLATION_WARN',
          `skipping RLS check: ${bypass.rows[0].usr} has BYPASSRLS and role ${appRole} missing`,
        );
      }
    }

    const stillBypass = await client.query(
      `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    if (!stillBypass.rows[0]?.rolbypassrls) {
      await client.query(`SELECT set_config('app.church_id', $1, true)`, [
        churchA,
      ]);
      for (const table of TENANT_TABLES) {
        if (predicateResults[table] !== 0) continue;
        const home = await client.query(
          `SELECT count(*)::int AS n FROM ${quoteIdent(table)}`,
        );
        rlsHome[table] = home.rows[0].n;
      }
      if ((rlsHome.roles ?? 0) < 1) {
        throw new Error('expected at least one role visible for church A under RLS');
      }

      await client.query(`SELECT set_config('app.church_id', $1, true)`, [
        churchB,
      ]);
      for (const table of TENANT_TABLES) {
        if (predicateResults[table] !== 0) continue;
        const foreign = await client.query(
          `SELECT count(*)::int AS n FROM ${quoteIdent(table)}`,
        );
        if (foreign.rows[0].n !== 0) {
          throw new Error(
            `RLS leak on ${table}: church B session saw ${foreign.rows[0].n} rows`,
          );
        }
      }
      rlsChecked = true;
    }

    await client.query('ROLLBACK');
    console.log('SMOKE_RBAC_ISOLATION_OK', {
      tables: TENANT_TABLES.length,
      predicateForeign: predicateResults,
      rlsChecked,
      churchASample: rlsChecked
        ? {
            roles: rlsHome.roles,
            organisation_users: rlsHome.organisation_users,
            memberships: rlsHome.memberships,
          }
        : null,
      appRole: rlsChecked ? appRole : null,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('SMOKE_RBAC_ISOLATION_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
