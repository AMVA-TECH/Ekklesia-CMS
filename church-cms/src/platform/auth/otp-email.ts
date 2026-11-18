/**
 * Optional SMTP delivery for MFA OTP emails.
 * Configure AUTH_SMTP_* in `.env.local` (never commit secrets).
 */

import { fillOutbound, outboundMessages } from '@/i18n/outbound-messages';

export type OtpEmailSendResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendOtpEmail(input: {
  to: string;
  otp: string;
  /** Member-facing product name from church branding (DEC-033). */
  productName?: string;
  /** Recipient preferred locale (`en` | `sw`). */
  locale?: string | null;
}): Promise<OtpEmailSendResult> {
  const host = process.env.AUTH_SMTP_HOST?.trim();
  const user = process.env.AUTH_SMTP_USER?.trim();
  const pass = process.env.AUTH_SMTP_PASS?.trim();
  const from =
    process.env.AUTH_EMAIL_FROM?.trim() ||
    user ||
    'noreply@localhost';

  if (!host || !user || !pass) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  const port = Number(process.env.AUTH_SMTP_PORT || '587');
  const secure =
    process.env.AUTH_SMTP_SECURE === '1' ||
    process.env.AUTH_SMTP_SECURE === 'true' ||
    port === 465;

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const productName = input.productName?.trim() || 'Ekklesia';
    const copy = outboundMessages(input.locale);
    const vars = { product: productName, otp: input.otp };
    await transporter.sendMail({
      from,
      to: input.to,
      subject: fillOutbound(copy.otpEmailSubject, vars),
      text: fillOutbound(copy.otpEmailText, vars),
      html: fillOutbound(copy.otpEmailHtml, vars),
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'smtp_send_failed';
    return { ok: false, error: message.slice(0, 200) };
  }
}
