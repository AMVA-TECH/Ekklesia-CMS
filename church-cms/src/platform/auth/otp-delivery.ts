import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/platform/db/client';
import { getNotifyAdapter } from '@/platform/notify';
import { churchSettings } from '@/modules/churches/db-schema';
import { resolveChurchSettings } from '@/modules/churches/settings-schema';
import { organisationUsers, userAccounts } from '@/modules/people/db-schema';
import { user as authUser } from './db-schema';
import { sendOtpEmail } from './otp-email';

export type OtpDeliveryChannel = 'sms' | 'email' | 'sms+email';

export type OtpDeliveryResult =
  | { ok: true; channel: OtpDeliveryChannel; toMasked: string }
  | { ok: false; error: string };

let lastDevOtp: { otp: string; at: number } | null = null;

function isDevOtpRevealAllowed(): boolean {
  // Opt-in only — real SMS/email tests must not leak the code on screen.
  return (
    process.env.AUTH_OTP_DEV_REVEAL === '1' &&
    process.env.ALLOW_DEV_AUTH === '1' &&
    process.env.NODE_ENV !== 'production'
  );
}

/**
 * Last MFA OTP for local UI only (`AUTH_OTP_DEV_REVEAL=1`, non-production).
 * Never exposed in production.
 */
export function peekDevOtp(): string | null {
  if (!isDevOtpRevealAllowed() || !lastDevOtp) return null;
  if (Date.now() - lastDevOtp.at > 5 * 60_000) return null;
  return lastDevOtp.otp;
}

function rememberDevOtp(otp: string): void {
  if (!isDevOtpRevealAllowed()) return;
  lastDevOtp = { otp, at: Date.now() };
}

function maskDestination(value: string, channel: 'sms' | 'email'): string {
  if (channel === 'sms') {
    return value.length <= 6 ? '***' : `${value.slice(0, 4)}…${value.slice(-2)}`;
  }
  const [local, domain] = value.split('@');
  if (!domain) return '***';
  return `${(local ?? '').slice(0, 2)}…@${domain}`;
}

/**
 * Deliver MFA OTP via SMS and/or email when channels exist.
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

  rememberDevOtp(input.otp);
  captureOtpForSmoke(input.otp);

  const sent: Array<'sms' | 'email'> = [];
  const masks: string[] = [];
  const errors: string[] = [];

  const productName = await resolveOtpProductName(input.userId);

  if (phone) {
    const notify = getNotifyAdapter();
    const result = await notify.send({
      channel: 'sms',
      to: phone,
      body: `Your ${productName} verification code is ${input.otp}. It expires in a few minutes.`,
      idempotencyKey: `auth-otp-sms:${input.userId ?? phone}:${randomUUID()}`,
    });
    if (result.ok) {
      sent.push('sms');
      masks.push(maskDestination(phone, 'sms'));
    } else {
      errors.push(result.error || 'sms_send_failed');
    }
  }

  if (email) {
    const emailResult = await deliverOtpEmailChannel(
      email,
      input.otp,
      productName,
    );
    if (emailResult.ok) {
      sent.push('email');
      masks.push(maskDestination(email, 'email'));
    } else {
      errors.push(emailResult.error);
    }
  }

  if (sent.length === 0) {
    return {
      ok: false,
      error: errors[0] || 'no_otp_channel',
    };
  }

  const channel: OtpDeliveryChannel =
    sent.length === 2 ? 'sms+email' : sent[0]!;

  return {
    ok: true,
    channel,
    toMasked: masks.join(' · '),
  };
}

async function resolveOtpProductName(userId: string | undefined): Promise<string> {
  if (!userId) return 'Ekklesia';
  try {
    const db = getDb();
    const [org] = await db
      .select({ churchId: organisationUsers.churchId })
      .from(organisationUsers)
      .where(
        and(
          eq(organisationUsers.userAccountId, userId),
          eq(organisationUsers.status, 'active'),
          isNull(organisationUsers.deletedAt),
        ),
      )
      .limit(1);
    if (!org?.churchId) return 'Ekklesia';
    const [row] = await db
      .select({ settings: churchSettings.settings })
      .from(churchSettings)
      .where(
        and(
          eq(churchSettings.churchId, org.churchId),
          isNull(churchSettings.deletedAt),
        ),
      )
      .limit(1);
    return resolveChurchSettings(
      (row?.settings as Record<string, unknown> | undefined) ?? {},
    ).branding.productName;
  } catch {
    return 'Ekklesia';
  }
}

async function deliverOtpEmailChannel(
  email: string,
  otp: string,
  productName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Real SMTP when configured.
  if (process.env.AUTH_EMAIL_OTP_STUB === '0') {
    return sendOtpEmail({ to: email, otp, productName });
  }

  // Dev stub — does not include OTP in logs.
  console.info(
    `[auth:email-otp-stub] sent to ${maskDestination(email, 'email')}`,
  );
  return { ok: true };
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
