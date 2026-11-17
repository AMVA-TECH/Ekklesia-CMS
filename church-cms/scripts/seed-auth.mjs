#!/usr/bin/env node
/**
 * Seed Better Auth credential rows for CrossLife-dev fixtures.
 * Bridges BA `user.id` === `user_accounts.id` (ADR-0002).
 *
 * PIN (all three): DEV_AUTH_PIN or default `123456`
 * Admin + finance get twoFactorEnabled=true (OTP MFA).
 *
 * Optional local overrides (never commit real PII — use `.env.local`):
 *   DEV_ADMIN_EMAIL, DEV_ADMIN_PHONE (e.g. 0716… or +255…)
 *
 * Usage: pnpm db:seed:auth
 */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv();

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/church_cms';
const pin = process.env.DEV_AUTH_PIN || '123456';

/** Tanzania-friendly phone → E.164 +255… */
function normalizeTzPhone(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  let national = digits;
  if (digits.startsWith('255')) national = digits.slice(3);
  else if (digits.startsWith('0')) national = digits.slice(1);
  if (national.startsWith('0')) national = national.slice(1);
  if (!/^[67]\d{8}$/.test(national)) return null;
  return `+255${national}`;
}

const require = createRequire(import.meta.url);

async function loadHashPassword() {
  try {
    const mod = await import('better-auth/crypto');
    return mod.hashPassword;
  } catch {
    const mod = await import(
      new URL('../node_modules/better-auth/dist/crypto/index.mjs', import.meta.url).href
    );
    return mod.hashPassword;
  }
}

let Pool;
try {
  ({ Pool } = require('pg'));
} catch {
  ({ Pool } = require('/tmp/pg-full/node_modules/pg'));
}

const adminEmail =
  process.env.DEV_ADMIN_EMAIL?.trim() || 'admin@example.test';
const adminPhone =
  normalizeTzPhone(process.env.DEV_ADMIN_PHONE || '') || '+255700000001';

const USERS = [
  {
    id: 'cccccccc-0001-0001-0001-000000000001',
    email: adminEmail,
    name: 'Dev Admin',
    phone: adminPhone,
    twoFactorEnabled: true,
  },
  {
    id: 'cccccccc-0001-0001-0001-000000000002',
    email: 'member@example.test',
    name: 'Dev Member',
    phone: '+255700000002',
    twoFactorEnabled: false,
  },
  {
    id: 'cccccccc-0001-0001-0001-000000000003',
    email: 'finance@example.test',
    name: 'Dev Finance',
    phone: '+255700000003',
    twoFactorEnabled: true,
  },
  {
    id: 'cccccccc-0001-0001-0001-000000000004',
    email: 'platform@example.test',
    name: 'Dev Platform Operator',
    phone: '+255700000004',
    twoFactorEnabled: true,
  },
];

async function main() {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('DEV_AUTH_PIN must be 4–8 digits');
  }
  const hashPassword = await loadHashPassword();
  const hashed = await hashPassword(pin);
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    for (const u of USERS) {
      await client.query(
        `INSERT INTO "user" (
           id, name, email, email_verified,
           phone_number, phone_number_verified, two_factor_enabled,
           created_at, updated_at
         ) VALUES (
           $1::uuid, $2, $3, true,
           $4, true, $5,
           now(), now()
         )
         ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               email = EXCLUDED.email,
               email_verified = true,
               phone_number = EXCLUDED.phone_number,
               phone_number_verified = true,
               two_factor_enabled = EXCLUDED.two_factor_enabled,
               updated_at = now()`,
        [u.id, u.name, u.email, u.phone, u.twoFactorEnabled],
      );

      const existing = await client.query(
        `SELECT id FROM account
         WHERE user_id = $1::uuid AND provider_id = 'credential'
         LIMIT 1`,
        [u.id],
      );

      if (existing.rows[0]) {
        await client.query(
          `UPDATE account
           SET password = $1, account_id = $2, updated_at = now()
           WHERE id = $3::uuid`,
          [hashed, u.id, existing.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO account (
             id, account_id, provider_id, user_id, password, created_at, updated_at
           ) VALUES ($1::uuid, $2, 'credential', $3::uuid, $4, now(), now())`,
          [randomUUID(), u.id, u.id, hashed],
        );
      }

      // Keep CMS user_accounts in sync (login / OTP channel lookup).
      await client.query(
        `INSERT INTO user_accounts (id, email, phone_e164, status)
         VALUES ($1::uuid, $2, $3, 'active')
         ON CONFLICT (id) DO UPDATE
           SET email = EXCLUDED.email,
               phone_e164 = EXCLUDED.phone_e164,
               status = 'active',
               updated_at = now()`,
        [u.id, u.email, u.phone],
      );
    }
    console.log('SEED_AUTH_OK', {
      users: USERS.map((u) => ({
        email: u.email,
        phone: u.phone,
        mfa: u.twoFactorEnabled,
      })),
      pinEnv: process.env.DEV_AUTH_PIN ? 'DEV_AUTH_PIN' : 'default',
      adminOverride: Boolean(
        process.env.DEV_ADMIN_EMAIL || process.env.DEV_ADMIN_PHONE,
      ),
    });
  } catch (error) {
    console.error('SEED_AUTH_FAIL', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
