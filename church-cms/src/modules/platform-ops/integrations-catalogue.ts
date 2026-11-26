/**
 * Built-in global integration directory (Phase 4).
 * Secrets never appear here — only non-sensitive config evidence.
 */

export type IntegrationCategory =
  | 'messaging'
  | 'email'
  | 'auth'
  | 'payments'
  | 'storage'
  | 'other';

export type IntegrationCatalogueEntry = {
  code: string;
  name: string;
  category: IntegrationCategory;
  scope: 'global' | 'tenant';
  description: string;
};

export const INTEGRATION_CATALOGUE: readonly IntegrationCatalogueEntry[] = [
  {
    code: 'notify.stub',
    name: 'Notify stub',
    category: 'messaging',
    scope: 'global',
    description: 'Development stub for SMS/WhatsApp (no external provider).',
  },
  {
    code: 'notify.briq',
    name: 'Briq Karibu',
    category: 'messaging',
    scope: 'global',
    description: 'SMS/WhatsApp via Briq Karibu; inbound DLR webhooks.',
  },
  {
    code: 'notify.smsgate',
    name: 'SMSGate',
    category: 'messaging',
    scope: 'global',
    description: 'Android SMS gateway adapter (testing).',
  },
  {
    code: 'notify.http',
    name: 'HTTP notify',
    category: 'messaging',
    scope: 'global',
    description: 'Generic HTTP SMS/WhatsApp endpoints.',
  },
  {
    code: 'auth.smtp',
    name: 'Auth SMTP',
    category: 'email',
    scope: 'global',
    description: 'Optional SMTP for MFA OTP and registration mail.',
  },
  {
    code: 'auth.better_auth',
    name: 'Better Auth',
    category: 'auth',
    scope: 'global',
    description: 'Session and credential provider (ADR-0002).',
  },
  {
    code: 'payments',
    name: 'Payments',
    category: 'payments',
    scope: 'global',
    description: 'Payment gateway integrations (not configured).',
  },
] as const;

export const INTEGRATION_HEALTH = [
  'operational',
  'degraded',
  'unavailable',
  'unknown',
] as const;

export type IntegrationHealth = (typeof INTEGRATION_HEALTH)[number];

const SECRET_KEY =
  /secret|token|password|authorization|api[_-]?key|credential|private/i;

/** Deep-ish redact of sensitive keys for persisted webhook payloads. */
export function redactPayload(input: unknown): Record<string, unknown> {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object') {
    return { value: String(input).slice(0, 500) };
  }
  if (Array.isArray(input)) {
    return {
      items: input.slice(0, 50).map((item) => {
        if (item && typeof item === 'object') return redactPayload(item);
        return item;
      }),
    };
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (value && typeof value === 'object') {
      out[key] = Array.isArray(value)
        ? value.slice(0, 50).map((v) =>
            v && typeof v === 'object' ? redactPayload(v) : v,
          )
        : redactPayload(value);
    } else if (typeof value === 'string' && value.length > 2000) {
      out[key] = `${value.slice(0, 2000)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}
