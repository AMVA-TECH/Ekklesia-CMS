import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSmsGateNotifyAdapter,
  normalizeSmsGatePhone,
} from '../smsgate-adapter.ts';

describe('normalizeSmsGatePhone', () => {
  it('keeps E.164', () => {
    assert.equal(normalizeSmsGatePhone('+255700000001'), '+255700000001');
  });

  it('maps Tanzania local 07…', () => {
    assert.equal(normalizeSmsGatePhone('0700000001'), '+255700000001');
  });
});

describe('smsgate adapter', () => {
  it('refuses numbers outside SMS_TEST_RECIPIENTS', async () => {
    const adapter = createSmsGateNotifyAdapter({
      url: 'https://api.sms-gate.app/3rdparty/v1/messages',
      username: 'u',
      password: 'p',
      testRecipients: '+255711111111',
    });
    const result = await adapter.send({
      channel: 'sms',
      to: '+255700000001',
      body: 'test',
      idempotencyKey: 'k1',
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, 'not_on_sms_test_recipients');
    }
  });

  it('posts RentFlow-compatible body with Basic auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ id: 'msg-99' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const adapter = createSmsGateNotifyAdapter({
        url: 'https://api.sms-gate.app/3rdparty/v1/messages',
        username: '8RJJQN',
        password: 'secret',
        testRecipients: '*',
      });
      const result = await adapter.send({
        channel: 'sms',
        to: '0700000001',
        body: 'Hello',
        idempotencyKey: 'k2',
      });
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(result.providerRef, 'msg-99');

      assert.equal(calls.length, 1);
      const auth = String(
        (calls[0]?.init.headers as Record<string, string>).authorization,
      );
      assert.ok(auth.startsWith('Basic '));
      const body = JSON.parse(String(calls[0]?.init.body)) as {
        textMessage: { text: string };
        phoneNumbers: string[];
        priority: number;
      };
      assert.deepEqual(body, {
        textMessage: { text: 'Hello' },
        phoneNumbers: ['+255700000001'],
        priority: 100,
      });
    } finally {
      globalThis.fetch = original;
    }
  });
});
