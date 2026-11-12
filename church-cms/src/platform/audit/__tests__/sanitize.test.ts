import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sanitizeAuditMetadata } from '../sanitize.ts';

describe('sanitizeAuditMetadata', () => {
  it('redacts amount and phone keys', () => {
    const out = sanitizeAuditMetadata({
      channel: 'sms',
      amountMinor: 50000,
      phone: '+255700000001',
      recipientCount: 3,
    });
    assert.equal(out.channel, 'sms');
    assert.equal(out.amountMinor, '[redacted]');
    assert.equal(out.phone, '[redacted]');
    assert.equal(out.recipientCount, 3);
  });

  it('redacts nested sensitive keys', () => {
    const out = sanitizeAuditMetadata({
      nested: { toAddress: '+2557', ok: true },
    });
    assert.deepEqual(out.nested, { toAddress: '[redacted]', ok: true });
  });
});
