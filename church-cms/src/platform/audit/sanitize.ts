const EXACT_REDACT_KEYS = new Set([
  'phone',
  'email',
  'password',
  'secret',
  'token',
  'amount',
  'amountMinor',
  'debitMinor',
  'creditMinor',
  'iban',
  'accountNumber',
  'toAddress',
  'body',
  'note',
  'resolutionNote',
  'pastoralNote',
  'checkInPhone',
  'checkInName',
]);

const REDACTED_KEY_PATTERN =
  /(phone|email|password|secret|token|amount.?minor|to.?address|iban|account.?number)/i;

function shouldRedactKey(key: string): boolean {
  return EXACT_REDACT_KEYS.has(key) || REDACTED_KEY_PATTERN.test(key);
}

/**
 * Strip Restricted/sensitive values from audit metadata for list responses.
 * Structure preserved; matching keys become "[redacted]".
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {};
  return sanitizeValue(metadata) as Record<string, unknown>;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (shouldRedactKey(key)) {
        out[key] = '[redacted]';
      } else {
        out[key] = sanitizeValue(child);
      }
    }
    return out;
  }
  return value;
}
