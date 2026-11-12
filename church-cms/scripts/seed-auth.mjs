#!/usr/bin/env node
/**
 * Seed Better Auth credential rows for CrossLife-dev fixtures.
 * Bridges BA `user.id` === `user_accounts.id` (ADR-0002).
 *
 * PIN (all three): DEV_AUTH_PIN or default `123456`
 * Admin + finance get twoFactorEnabled=true (OTP MFA).
 *
 * Usage: pnpm db:seed:auth
 */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/church_cms';
const pin = process.env.DEV_AUTH_PIN || '123456';

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

const USERS = [
  {
    id: 'cccccccc-0001-0001-0001-000000000001',
    email: 'admin@example.test',
    name: 'Dev Admin',
    phone: '+255700000001',
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
    }
    console.log('SEED_AUTH_OK', {
      users: USERS.map((u) => ({
        email: u.email,
        phone: u.phone,
        mfa: u.twoFactorEnabled,
      })),
      pinEnv: process.env.DEV_AUTH_PIN ? 'DEV_AUTH_PIN' : 'default',
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
