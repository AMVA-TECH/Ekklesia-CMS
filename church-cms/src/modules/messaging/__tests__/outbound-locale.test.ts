import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveOutboundBody } from '../outbound-locale.ts';

describe('resolveOutboundBody', () => {
  const bodies = new Map([
    ['sw', 'Karibu ibada'],
    ['en', 'Welcome to service'],
  ]);

  it('prefers recipient preferredLocale', () => {
    assert.equal(
      resolveOutboundBody({
        preferredLocale: 'en',
        churchLocale: 'sw',
        jobBody: 'fallback',
        bodiesByLocale: bodies,
      }),
      'Welcome to service',
    );
  });

  it('falls back to church locale then job body', () => {
    assert.equal(
      resolveOutboundBody({
        preferredLocale: 'fr',
        churchLocale: 'sw',
        jobBody: 'fallback',
        bodiesByLocale: bodies,
      }),
      'Karibu ibada',
    );
    assert.equal(
      resolveOutboundBody({
        preferredLocale: null,
        churchLocale: null,
        jobBody: 'fallback',
        bodiesByLocale: new Map(),
      }),
      'fallback',
    );
  });
});
