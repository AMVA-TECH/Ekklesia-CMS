#!/usr/bin/env node
/**
 * Auth smoke without Next:
 * - member email+PIN and phone+PIN → full session, no MFA
 * - admin email+PIN → twoFactorRedirect → send OTP → verify → session
 *
 * Run: pnpm db:smoke:auth-login-api
 */
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  /* optional */
}

const pin = process.env.DEV_AUTH_PIN || '123456';
const expectedChurchId = '11111111-1111-1111-1111-111111111111';

function cookieHeader(res) {
  const cookies = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!cookies) throw new Error('missing Set-Cookie');
  return cookies;
}

async function main() {
  process.env.NOTIFY_STUB_LOG = '0';
  const captureDir = mkdtempSync(join(tmpdir(), 'cms-otp-'));
  const captureFile = join(captureDir, 'otp.txt');
  process.env.AUTH_OTP_CAPTURE_FILE = captureFile;

  const { resetEnvCache } = await import('../src/platform/config/env.ts');
  const { resetAuthForTests, getAuth } = await import(
    '../src/platform/auth/better-auth.ts'
  );
  const { resolveSessionClaims } = await import(
    '../src/platform/auth/resolve-session.ts'
  );
  resetEnvCache();
  resetAuthForTests();
  const auth = getAuth();

  // --- member email + PIN ---
  const memberEmailRes = await auth.api.signInEmail({
    body: { email: 'member@example.test', password: pin },
    asResponse: true,
  });
  if (!memberEmailRes.ok) {
    throw new Error(`member email login failed: ${memberEmailRes.status} ${await memberEmailRes.text()}`);
  }
  const memberEmailBody = await memberEmailRes.clone().json();
  if (memberEmailBody.twoFactorRedirect) {
    throw new Error('member should not require MFA');
  }
  const memberEmailClaims = await resolveSessionClaims(
    new Request('http://127.0.0.1/api/v1/auth/me', {
      headers: { cookie: cookieHeader(memberEmailRes) },
    }),
  );
  if (!memberEmailClaims || memberEmailClaims.activeChurchId !== expectedChurchId) {
    throw new Error(`member email claims bad: ${JSON.stringify(memberEmailClaims)}`);
  }

  // --- member phone + PIN ---
  const memberPhoneRes = await auth.api.signInPhoneNumber({
    body: { phoneNumber: '+255700000002', password: pin },
    asResponse: true,
  });
  if (!memberPhoneRes.ok) {
    throw new Error(`member phone login failed: ${memberPhoneRes.status} ${await memberPhoneRes.text()}`);
  }
  const memberPhoneBody = await memberPhoneRes.clone().json();
  if (memberPhoneBody.twoFactorRedirect) {
    throw new Error('member phone should not require MFA');
  }

  // --- admin PIN → MFA challenge ---
  const adminLoginRes = await auth.api.signInEmail({
    body: { email: 'admin@example.test', password: pin },
    asResponse: true,
  });
  if (!adminLoginRes.ok) {
    throw new Error(`admin login failed: ${adminLoginRes.status} ${await adminLoginRes.text()}`);
  }
  const adminLoginBody = await adminLoginRes.clone().json();
  if (!adminLoginBody.twoFactorRedirect) {
    throw new Error(`admin expected twoFactorRedirect, got ${JSON.stringify(adminLoginBody)}`);
  }
  const challengeCookie = cookieHeader(adminLoginRes);

  // Pending MFA must not yield API claims
  const pendingClaims = await resolveSessionClaims(
    new Request('http://127.0.0.1/api/v1/auth/me', {
      headers: { cookie: challengeCookie },
    }),
  );
  if (pendingClaims) {
    throw new Error('admin MFA-pending must not resolve session claims');
  }

  const sendRes = await auth.api.sendTwoFactorOTP({
    body: {},
    headers: new Headers({ cookie: challengeCookie }),
    asResponse: true,
  });
  if (!sendRes.ok) {
    throw new Error(`send OTP failed: ${sendRes.status} ${await sendRes.text()}`);
  }
  const sendCookies = [
    ...challengeCookie.split('; '),
    ...(sendRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]),
  ].join('; ');

  const otp = readFileSync(captureFile, 'utf8').trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new Error(`captured OTP invalid: ${otp}`);
  }

  const verifyRes = await auth.api.verifyTwoFactorOTP({
    body: { code: otp },
    headers: new Headers({ cookie: sendCookies }),
    asResponse: true,
  });
  if (!verifyRes.ok) {
    throw new Error(`verify OTP failed: ${verifyRes.status} ${await verifyRes.text()}`);
  }
  const adminClaims = await resolveSessionClaims(
    new Request('http://127.0.0.1/api/v1/auth/me', {
      headers: { cookie: cookieHeader(verifyRes) },
    }),
  );
  if (!adminClaims?.permissions.includes('people:read')) {
    throw new Error(`admin claims bad: ${JSON.stringify(adminClaims)}`);
  }

  console.log('SMOKE_AUTH_LOGIN_API_OK', {
    memberEmail: memberEmailClaims.userAccountId,
    memberPhoneOk: true,
    adminMfaOk: true,
    adminPermissionCount: adminClaims.permissions.length,
  });

  rmSync(captureDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error('SMOKE_AUTH_LOGIN_API_FAIL', error);
  process.exitCode = 1;
});
