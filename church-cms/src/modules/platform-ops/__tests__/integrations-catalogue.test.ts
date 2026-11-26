import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INTEGRATION_CATALOGUE,
  redactPayload,
} from '../integrations-catalogue.ts';
import { replayWebhookBodySchema } from '../integrations-schemas.ts';

describe('INTEGRATION_CATALOGUE', () => {
  it('includes messaging providers without secrets', () => {
    const codes = INTEGRATION_CATALOGUE.map((e) => e.code);
    assert.ok(codes.includes('notify.briq'));
    assert.ok(codes.includes('notify.stub'));
  });
});

describe('redactPayload', () => {
  it('redacts secret-like keys', () => {
    const out = redactPayload({
      event: 'sms.delivered',
      api_key: 'should-hide',
      data: { message_id: 'm1', password: 'x' },
    });
    assert.equal(out.api_key, '[redacted]');
    assert.equal(out.event, 'sms.delivered');
    const data = out.data as Record<string, unknown>;
    assert.equal(data.message_id, 'm1');
    assert.equal(data.password, '[redacted]');
  });
});

describe('replayWebhookBodySchema', () => {
  it('requires a reason', () => {
    assert.throws(() => replayWebhookBodySchema.parse({ reason: 'short' }));
    const ok = replayWebhookBodySchema.parse({
      reason: 'Retry after transient provider outage',
    });
    assert.ok(ok.reason.length >= 8);
  });
});
