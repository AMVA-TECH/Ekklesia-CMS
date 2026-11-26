/**
 * Best-effort email for church registration verify / admin invite.
 * Uses AUTH_SMTP_* when configured; otherwise logs a non-secret notice.
 */

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
    console.info(
      `[registration-mail] smtp not configured; skip send to ${input.to.slice(0, 3)}… subject=${input.subject}`,
    );
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

export async function sendRegistrationVerifyEmail(input: {
  to: string;
  verifyUrl: string;
  churchName: string;
}): Promise<void> {
  const result = await sendPlainEmail({
    to: input.to,
    subject: `Verify your church registration — ${input.churchName}`,
    text: [
      `Thank you for applying to register ${input.churchName} on Ekklesia.`,
      '',
      'Confirm your email by opening this link:',
      input.verifyUrl,
      '',
      'If you did not submit this application, you can ignore this message.',
    ].join('\n'),
  });
  if (!result.ok && process.env.NODE_ENV !== 'production') {
    console.info(
      `[registration-mail:dev] verify URL for ${input.to}: ${input.verifyUrl}`,
    );
  }
}

export async function sendAdminInviteEmail(input: {
  to: string;
  inviteUrl: string;
  churchName: string;
}): Promise<void> {
  const result = await sendPlainEmail({
    to: input.to,
    subject: `Activate your church on Ekklesia — ${input.churchName}`,
    text: [
      `Your church ${input.churchName} has been approved and provisioned.`,
      '',
      'Set your administrator PIN and activate the tenant:',
      input.inviteUrl,
      '',
      'This link expires in 7 days.',
    ].join('\n'),
  });
  if (!result.ok && process.env.NODE_ENV !== 'production') {
    console.info(
      `[registration-mail:dev] invite URL for ${input.to}: ${input.inviteUrl}`,
    );
  }
}
