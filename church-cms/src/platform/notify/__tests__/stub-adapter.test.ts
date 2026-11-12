import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStubNotifyAdapter } from '../stub-adapter.ts';

describe('stub notify adapter', () => {
  it('returns a stub providerRef for valid sends', async () => {
    process.env.NOTIFY_STUB_LOG = '0';
    const adapter = createStubNotifyAdapter();
    const result = await adapter.send({
      channel: 'sms',
      to: '+255700000001',
      body: 'Huduma kesho',
      idempotencyKey: 'deliv-1',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.providerRef, 'stub:sms:deliv-1');
    }
  });

  it('fails on empty destination', async () => {
    const adapter = createStubNotifyAdapter();
    const result = await adapter.send({
      channel: 'whatsapp',
      to: '  ',
      body: 'x',
      idempotencyKey: 'deliv-2',
    });
    assert.equal(result.ok, false);
  });
});
