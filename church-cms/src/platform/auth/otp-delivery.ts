import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/platform/db/client';
import { getNotifyAdapter } from '@/platform/notify';
import { userAccounts } from '@/modules/people/db-schema';
import { user as authUser } from './db-schema';

export type OtpDeliveryChannel = 'sms' | 'email';

export type OtpDeliveryResult =
  | { ok: true; channel: OtpDeliveryChannel; toMasked: string }
  | { ok: false; error: string };

function maskDestination(value: string, channel: OtpDeliveryChannel): string {
  if (channel === 'sms') {
    return value.length <= 6 ? '***' : `${value.slice(0, 4)}…${value.slice(-2)}`;
  }
  const [local, domain] = value.split('@');
  if (!domain) return '***';
  return `${(local ?? '').slice(0, 2)}…@${domain}`;
}

/**
 * Deliver MFA OTP: prefer SMS, else email.
 * Never logs the OTP. Optional AUTH_OTP_CAPTURE_FILE for automated smoke only.
 */
export async function deliverAuthOtp(input: {
  userId?: string;
  otp: string;
  /** Prefer this phone when present (BA user.phoneNumber). */
  phoneNumber?: string | null;
  email?: string | null;
}): Promise<OtpDeliveryResult> {
  let accountEmail: string | null = null;
  let accountPhone: string | null = null;
  let baPhone: string | null = null;
  let baEmail: string | null = null;

  if (input.userId) {
    const db = getDb();
    const [account] = await db
      .select({
        email: userAccounts.email,
        phoneE164: userAccounts.phoneE164,
      })
      .from(userAccounts)
      .where(and(eq(userAccounts.id, input.userId), isNull(userAccounts.deletedAt)))
      .limit(1);
    accountEmail = account?.email ?? null;
    accountPhone = account?.phoneE164 ?? null;

    const [baUser] = await db
      .select({
        phoneNumber: authUser.phoneNumber,
        email: authUser.email,
      })
      .from(authUser)
      .where(eq(authUser.id, input.userId))
      .limit(1);
    baPhone = baUser?.phoneNumber ?? null;
    baEmail = baUser?.email ?? null;
  }

  const phone =
    input.phoneNumber?.trim() ||
    baPhone?.trim() ||
    accountPhone?.trim() ||
    null;
  const email =
    input.email?.trim() ||
    baEmail?.trim() ||
    accountEmail?.trim() ||
    null;

  captureOtpForSmoke(input.otp);

  if (phone) {
    const notify = getNotifyAdapter();
    const result = await notify.send({
      channel: 'sms',
      to: phone,
      body: `Your CrossLife verification code is ${input.otp}. It expires in a few minutes.`,
      idempotencyKey: `auth-otp:${input.userId ?? phone}:${randomUUID()}`,
    });
    if (!result.ok) {
      return { ok: false, error: result.error || 'sms_send_failed' };
    }
    return { ok: true, channel: 'sms', toMasked: maskDestination(phone, 'sms') };
  }

  if (email) {
    // Thin email stub until SMTP is wired; body never goes to app logs.
    if (process.env.AUTH_EMAIL_OTP_STUB !== '0') {
      // Intentionally no OTP in log line.
      console.info(`[auth:email-otp-stub] sent to ${maskDestination(email, 'email')}`);
    }
    return { ok: true, channel: 'email', toMasked: maskDestination(email, 'email') };
  }

  return { ok: false, error: 'no_otp_channel' };
}

function captureOtpForSmoke(otp: string): void {
  const path = process.env.AUTH_OTP_CAPTURE_FILE;
  if (!path) return;
  try {
    writeFileSync(path, otp, { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Smoke capture is best-effort; never fail delivery because of it.
  }
}
