import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { normalizeBriqRecipient } from '../briq-adapter.ts';
import { verifyBriqSignature } from '../briq-webhook.ts';

describe('briq recipient normalize', () => {
  it('keeps +E.164 digits', () => {
    assert.equal(normalizeBriqRecipient('+255 712 345 678'), '+255712345678');
  });

  it('strips non-digits when no plus', () => {
    assert.equal(normalizeBriqRecipient('255-712-345-678'), '255712345678');
  });
});

describe('briq webhook signature', () => {
  it('accepts valid sha256= HMAC', () => {
    const body = '{"id":"evt_1","event":"sms.sent","data":{}}';
    const secret = 'test-secret';
    const hex = createHmac('sha256', secret).update(body).digest('hex');
    assert.equal(verifyBriqSignature(body, secret, `sha256=${hex}`), true);
  });

  it('rejects bad signature', () => {
    assert.equal(verifyBriqSignature('{}', 'secret', 'sha256=deadbeef'), false);
  });
});
