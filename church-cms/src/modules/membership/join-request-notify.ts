import { createHash, randomUUID } from 'node:crypto';

import { fillOutbound, outboundMessages } from '@/i18n/outbound-messages';
import { getNotifyAdapter } from '@/platform/notify';

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_ORIGIN?.trim() ||
    'http://localhost:3000'
  );
}

async function sendPlainEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.AUTH_SMTP_HOST?.trim();
  const user = process.env.AUTH_SMTP_USER?.trim();
  const pass = process.env.AUTH_SMTP_PASS?.trim();
  const from =
    process.env.AUTH_EMAIL_FROM?.trim() || user || 'noreply@localhost';

  if (!host || !user || !pass) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  try {
    const nodemailer = await import('nodemailer');
    const port = Number(process.env.AUTH_SMTP_PORT || '587');
    const secure =
      process.env.AUTH_SMTP_SECURE === '1' ||
      process.env.AUTH_SMTP_SECURE === 'true' ||
      port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'smtp_send_failed';
    return { ok: false, error: message.slice(0, 200) };
  }
}

export type JoinCredentialNotifyResult = {
  sms: 'sent' | 'skipped' | 'failed';
  email: 'sent' | 'skipped' | 'failed';
  detail: string | null;
};

/** Best-effort SMS/email of the one-time member PIN after join approval. */
export async function notifyJoinApproved(input: {
  churchName: string;
  phoneE164: string;
  email: string | null;
  pin: string;
  locale: string | null;
}): Promise<JoinCredentialNotifyResult> {
  const copy = outboundMessages(input.locale);
  const vars = {
    church: input.churchName,
    phone: input.phoneE164,
    pin: input.pin,
    signInUrl: `${appOrigin()}/sign-in`,
  };
  const result: JoinCredentialNotifyResult = {
    sms: 'skipped',
    email: 'skipped',
    detail: null,
  };
  const notes: string[] = [];

  try {
    const adapter = getNotifyAdapter();
    const sms = await adapter.send({
      channel: 'sms',
      to: input.phoneE164,
      body: fillOutbound(copy.joinApprovedSms, vars),
      idempotencyKey: `join-approved-sms:${createHash('sha256')
        .update(`${input.phoneE164}:${input.pin}`)
        .digest('hex')
        .slice(0, 24)}`,
    });
    if (sms.ok) {
      result.sms = 'sent';
    } else {
      result.sms = adapter.name === 'stub' ? 'skipped' : 'failed';
      if (result.sms === 'failed') notes.push(`sms:${sms.error}`);
    }
  } catch (error) {
    result.sms = 'failed';
    notes.push(
      `sms:${error instanceof Error ? error.message.slice(0, 80) : 'error'}`,
    );
  }

  if (input.email) {
    const mail = await sendPlainEmail({
      to: input.email,
      subject: fillOutbound(copy.joinApprovedEmailSubject, vars),
      text: fillOutbound(copy.joinApprovedEmailText, vars),
    });
    if (mail.ok) {
      result.email = 'sent';
    } else {
      result.email =
        mail.error === 'smtp_not_configured' ? 'skipped' : 'failed';
      if (result.email === 'failed') notes.push(`email:${mail.error}`);
    }
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    result.sms !== 'sent' &&
    result.email !== 'sent'
  ) {
    console.info(
      `[join-request-notify:dev] approved credentials for ${input.phoneE164.slice(0, 6)}… (sms=${result.sms} email=${result.email}) id=${randomUUID().slice(0, 8)}`,
    );
  }

  result.detail = notes.length > 0 ? notes.join('; ') : null;
  return result;
}
