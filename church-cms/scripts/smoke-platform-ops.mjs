#!/usr/bin/env node
/**
 * Platform ops smoke (ADR-0003).
 * Requires: migrated DB, seed-dev, ALLOW_DEV_AUTH=1, pnpm dev (for HTTP checks).
 *
 * Usage:
 *   node scripts/smoke-platform-ops.mjs           # DB-only checks
 *   BASE_URL=http://127.0.0.1:3000 node scripts/smoke-platform-ops.mjs  # + HTTP
 */
import { createRequire } from 'node:module';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/church_cms';
const baseUrl = process.env.BASE_URL || process.env.PILOT_BASE_URL || '';

const require = createRequire(import.meta.url);
let Pool;
try {
  ({ Pool } = require('pg'));
} catch {
  ({ Pool } = require('/tmp/pg-full/node_modules/pg'));
}

const operatorId = 'cccccccc-0001-0001-0001-000000000004';
const churchId = '11111111-1111-1111-1111-111111111111';

const PLATFORM_HEADERS = {
  'x-dev-user-id': operatorId,
  'x-dev-platform-operator': '1',
  'x-dev-platform-permissions':
    'platform:read,platform:admin,platform:impersonate_tenant,platform:security_read',
  'content-type': 'application/json',
};

const MEMBER_HEADERS = {
  'x-dev-user-id': 'cccccccc-0001-0001-0001-000000000002',
  'x-dev-church-id': churchId,
  'x-dev-permissions': 'people:read',
};

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    const op = await client.query(
      `SELECT id, status FROM platform_operators
       WHERE user_account_id = $1 AND deleted_at IS NULL`,
      [operatorId],
    );
    if (!op.rows[0]) {
      throw new Error('platform operator seed missing — run pnpm db:seed:dev');
    }

    const auditId = crypto.randomUUID();
    await client.query(
      `INSERT INTO platform_audit_events (
         id, actor_user_id, action, outcome, church_id, entity_type, reason, metadata
       ) VALUES ($1, $2, 'platform.smoke', 'success', $3, 'platform', 'smoke test', '{}'::jsonb)`,
      [auditId, operatorId, churchId],
    );

    const audit = await client.query(
      `SELECT action FROM platform_audit_events WHERE id = $1`,
      [auditId],
    );
    if (audit.rows[0]?.action !== 'platform.smoke') {
      throw new Error('platform audit insert failed');
    }

    console.log('SMOKE_PLATFORM_OPS_DB_OK', { operator: op.rows[0].id });

    if (baseUrl) {
      const overview = await fetch(`${baseUrl}/api/v1/platform/overview`, {
        headers: PLATFORM_HEADERS,
      });
      if (!overview.ok) {
        throw new Error(`overview ${overview.status}: ${await overview.text()}`);
      }

      const forbidden = await fetch(`${baseUrl}/api/v1/platform/overview`, {
        headers: MEMBER_HEADERS,
      });
      if (forbidden.status !== 403 && forbidden.status !== 401) {
        throw new Error(`expected forbid for member, got ${forbidden.status}`);
      }

      const enter = await fetch(
        `${baseUrl}/api/v1/platform/tenants/${churchId}/enter`,
        {
          method: 'POST',
          headers: PLATFORM_HEADERS,
          body: JSON.stringify({
            reason: 'Smoke enter for platform ops verification',
          }),
        },
      );
      if (!enter.ok) {
        throw new Error(`enter ${enter.status}: ${await enter.text()}`);
      }

      console.log('SMOKE_PLATFORM_OPS_HTTP_OK', {
        overview: overview.status,
        forbidden: forbidden.status,
        enter: enter.status,
      });
    }
  } catch (error) {
    console.error('SMOKE_PLATFORM_OPS_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
