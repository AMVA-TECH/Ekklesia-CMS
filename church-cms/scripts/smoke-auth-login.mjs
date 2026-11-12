#!/usr/bin/env node
/**
 * HTTP login smoke against a running Next server (APP_URL).
 * Member email+PIN (no MFA). Prefer `pnpm db:smoke:auth-login-api` for full MFA coverage.
 */
const base = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const pin = process.env.DEV_AUTH_PIN || '123456';
const email = process.env.DEV_AUTH_EMAIL || 'member@example.test';

async function main() {
  const loginRes = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, pin }),
  });
  if (!loginRes.ok) {
    throw new Error(`login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const body = await loginRes.clone().json().catch(() => ({}));
  if (body.twoFactorRedirect) {
    throw new Error('unexpected MFA challenge for member fixture');
  }
  const rawCookie = loginRes.headers.getSetCookie?.() ?? [];
  const cookieHeader =
    rawCookie.map((c) => c.split(';')[0]).join('; ') ||
    (loginRes.headers.get('set-cookie') || '')
      .split(/,(?=\s*[^;]+=)/)
      .map((c) => c.split(';')[0].trim())
      .join('; ');
  if (!cookieHeader) throw new Error('login returned no Set-Cookie');

  const meRes = await fetch(`${base}/api/v1/auth/me`, {
    headers: { cookie: cookieHeader, 'accept-language': 'en' },
  });
  if (!meRes.ok) {
    throw new Error(`auth/me failed: ${meRes.status} ${await meRes.text()}`);
  }
  const me = await meRes.json();
  if (!me?.data?.actor?.email) {
    throw new Error(`unexpected me payload: ${JSON.stringify(me)}`);
  }
  console.log('SMOKE_AUTH_LOGIN_OK', {
    email: me.data.actor.email,
    churchId: me.data.church?.id,
    mfaRequired: me.data.mfaRequired,
  });
}

main().catch((error) => {
  console.error('SMOKE_AUTH_LOGIN_FAIL', error);
  process.exitCode = 1;
});
