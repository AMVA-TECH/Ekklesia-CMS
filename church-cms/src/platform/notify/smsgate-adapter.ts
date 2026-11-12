import type { NotifyAdapter, NotifyMessage, NotifySendResult } from './types';

export type SmsGateConfig = {
  url: string;
  username: string;
  password: string;
  timeoutMs?: number;
  /**
   * Comma-separated E.164 / local numbers, or `*` to allow any.
   * Required for safety when testing against a real SIM (same as RentFlow).
   */
  testRecipients?: string;
};

/** Normalize to E.164 with leading +. Tanzania locals 07… → +2557… */
export function normalizeSmsGatePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('255') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 10) {
    return `+255${digits.slice(1)}`;
  }
  return `+${digits}`;
}

function allowListMatches(
  phoneE164: string,
  testRecipients: string | undefined,
): boolean {
  if (!testRecipients || testRecipients.trim() === '') return false;
  if (testRecipients.trim() === '*') return true;
  const allowed = testRecipients
    .split(',')
    .map((p) => normalizeSmsGatePhone(p))
    .filter((p): p is string => !!p);
  return allowed.includes(phoneE164);
}

/**
 * SMSGate (SMS Gateway for Android) — same contract as RentFlow.
 * Basic auth + `{ textMessage: { text }, phoneNumbers: ["+255…"], priority }`.
 * @see https://docs.sms-gate.app/
 */
export function createSmsGateNotifyAdapter(config: SmsGateConfig): NotifyAdapter {
  return {
    name: 'smsgate',
    async send(message: NotifyMessage): Promise<NotifySendResult> {
      if (message.channel !== 'sms') {
        return {
          ok: false,
          error: 'smsgate_sms_only',
          retryable: false,
        };
      }

      const phone = normalizeSmsGatePhone(message.to);
      if (!phone) {
        return { ok: false, error: 'invalid_phone', retryable: false };
      }

      if (!allowListMatches(phone, config.testRecipients)) {
        return {
          ok: false,
          error: 'not_on_sms_test_recipients',
          retryable: false,
        };
      }

      if (!config.url || !config.username || !config.password) {
        return {
          ok: false,
          error: 'smsgate_not_configured',
          retryable: false,
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        config.timeoutMs ?? 15_000,
      );
      const basic = Buffer.from(
        `${config.username}:${config.password}`,
        'utf8',
      ).toString('base64');

      try {
        const res = await fetch(config.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            authorization: `Basic ${basic}`,
          },
          body: JSON.stringify({
            textMessage: { text: message.body },
            phoneNumbers: [phone],
            // 100–127 skips phone-app delay / quiet hours (RentFlow convention).
            priority: 100,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return {
            ok: false,
            error: `smsgate_${res.status}:${text.slice(0, 200)}`,
            retryable: res.status >= 500 || res.status === 429,
          };
        }

        const json = (await res.json().catch(() => ({}))) as { id?: string };
        const id =
          typeof json.id === 'string' && json.id.length > 0
            ? json.id.slice(0, 100)
            : `smsgate:${message.idempotencyKey}`;
        return { ok: true, providerRef: id };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { ok: false, error: msg, retryable: true };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
