#!/usr/bin/env node
/**
 * Minimal platform plane after wipe:
 *   - Upsert global permissions catalogue from code
 *   - Create one platform operator + Better Auth credential
 *   - Does NOT create any church
 *
 * Env:
 *   PLATFORM_BOOTSTRAP_EMAIL (default platform@example.test)
 *   PLATFORM_BOOTSTRAP_PHONE (default +255700000004)
 *   PLATFORM_BOOTSTRAP_NAME  (default Platform Operator)
 *   DEV_AUTH_PIN (default 123456)
 *
 * Usage: pnpm db:bootstrap:platform
 *        (or via node --experimental-strip-types --import ./scripts/register-ts-alias.mjs)
 */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv();

const require = createRequire(import.meta.url);

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/church_cms';

const pin = process.env.DEV_AUTH_PIN || '123456';
const operatorEmail =
  process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim().toLowerCase() ||
  'platform@example.test';
const operatorPhone =
  process.env.PLATFORM_BOOTSTRAP_PHONE?.trim() || '+255700000004';
const operatorName =
  process.env.PLATFORM_BOOTSTRAP_NAME?.trim() || 'Platform Operator';
/** Optional override only for migrations/tests — prefer email lookup + random id. */
const forcedOperatorId = process.env.PLATFORM_BOOTSTRAP_USER_ID?.trim() || null;

const DEFAULT_PLATFORM_PERMISSIONS = [
  'platform:read',
  'platform:admin',
  'platform:impersonate_tenant',
  'platform:security_read',
  'platform:churches_read',
  'platform:churches_write',
  'platform:applications_review',
  'platform:applications_decide',
  'platform:operators_manage',
  'platform:accounts_read',
  'platform:accounts_write',
  'platform:service_accounts',
  'platform:integrations_read',
  'platform:integrations_write',
  'platform:support_cases',
  'platform:access_reviews',
  'platform:break_glass',
  'platform:monitoring_read',
  'platform:audit_read',
  'platform:findings_manage',
  'platform:metrics_write',
  'platform:config_read',
  'platform:config_write',
  'platform:analytics_read',
];

async function loadHashPassword() {
  try {
    const mod = await import('better-auth/crypto');
    return mod.hashPassword;
  } catch {
    const mod = await import(
      new URL('../node_modules/better-auth/dist/crypto/index.mjs', import.meta.url)
        .href
    );
    return mod.hashPassword;
  }
}

async function main() {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('DEV_AUTH_PIN must be 4–8 digits');
  }

  const { getPermissionMeta } = await import(
    '../src/modules/access-control/permission-catalogue.ts'
  );
  const { PERMISSIONS } = await import(
    '../src/modules/access-control/permissions.ts'
  );

  const allCodes = [...PERMISSIONS];

  let Pool;
  try {
    ({ Pool } = require('pg'));
  } catch {
    ({ Pool } = require('/tmp/pg-full/node_modules/pg'));
  }

  const hashPassword = await loadHashPassword();
  const hashed = await hashPassword(pin);
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const byEmail = await client.query(
      `SELECT id FROM user_accounts
       WHERE lower(email) = lower($1) AND deleted_at IS NULL
       LIMIT 1`,
      [operatorEmail],
    );
    const operatorId =
      forcedOperatorId || byEmail.rows[0]?.id || randomUUID();

    for (const code of allCodes) {
      const meta = getPermissionMeta(code);
      const description = meta?.description ?? code;
      const moduleName =
        meta?.module ?? (code.startsWith('platform:') ? 'platform' : 'unknown');
      const sensitivity =
        meta?.sensitivity ??
        (code.startsWith('platform:') ? 'high_risk' : 'standard');
      await client.query(
        `INSERT INTO permissions (id, code, description, module, sensitivity)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE
           SET description = EXCLUDED.description,
               module = EXCLUDED.module,
               sensitivity = EXCLUDED.sensitivity`,
        [code, description, moduleName, sensitivity],
      );
    }

    await client.query(
      `INSERT INTO user_accounts (id, email, phone_e164, status)
       VALUES ($1::uuid, $2, $3, 'active')
       ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email,
             phone_e164 = EXCLUDED.phone_e164,
             status = 'active',
             updated_at = now()`,
      [operatorId, operatorEmail, operatorPhone],
    );

    await client.query(
      `INSERT INTO "user" (
         id, name, email, email_verified,
         phone_number, phone_number_verified, two_factor_enabled,
         created_at, updated_at
       ) VALUES (
         $1::uuid, $2, $3, true,
         $4, true, true,
         now(), now()
       )
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             email = EXCLUDED.email,
             email_verified = true,
             phone_number = EXCLUDED.phone_number,
             phone_number_verified = true,
             two_factor_enabled = true,
             updated_at = now()`,
      [operatorId, operatorName, operatorEmail, operatorPhone],
    );

    const existing = await client.query(
      `SELECT id FROM account
       WHERE user_id = $1::uuid AND provider_id = 'credential'
       LIMIT 1`,
      [operatorId],
    );

    if (existing.rows[0]) {
      await client.query(
        `UPDATE account
         SET password = $1, account_id = $2, updated_at = now()
         WHERE id = $3::uuid`,
        [hashed, operatorId, existing.rows[0].id],
      );
    } else {
      await client.query(
        `INSERT INTO account (
           id, account_id, provider_id, user_id, password, created_at, updated_at
         ) VALUES ($1::uuid, $2, 'credential', $3::uuid, $4, now(), now())`,
        [randomUUID(), operatorId, operatorId, hashed],
      );
    }

    const opExisting = await client.query(
      `SELECT id FROM platform_operators
       WHERE user_account_id = $1::uuid AND deleted_at IS NULL
       LIMIT 1`,
      [operatorId],
    );

    if (opExisting.rows[0]) {
      await client.query(
        `UPDATE platform_operators
         SET status = 'active',
             permissions = $1::jsonb,
             updated_at = now(),
             updated_by = $2::uuid
         WHERE id = $3::uuid`,
        [
          JSON.stringify(DEFAULT_PLATFORM_PERMISSIONS),
          operatorId,
          opExisting.rows[0].id,
        ],
      );
    } else {
      await client.query(
        `INSERT INTO platform_operators (
           id, user_account_id, status, permissions, created_by, updated_by
         ) VALUES (
           gen_random_uuid(), $1::uuid, 'active', $2::jsonb, $1::uuid, $1::uuid
         )`,
        [operatorId, JSON.stringify(DEFAULT_PLATFORM_PERMISSIONS)],
      );
    }

    await client.query('COMMIT');

    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM churches) AS churches,
        (SELECT count(*)::int FROM platform_operators) AS platform_operators,
        (SELECT count(*)::int FROM permissions) AS permissions
    `);

    console.log('BOOTSTRAP_PLATFORM_OK', {
      email: operatorEmail,
      phone: operatorPhone,
      name: operatorName,
      pinEnv: process.env.DEV_AUTH_PIN ? 'DEV_AUTH_PIN' : 'default',
      counts: counts.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('BOOTSTRAP_PLATFORM_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
