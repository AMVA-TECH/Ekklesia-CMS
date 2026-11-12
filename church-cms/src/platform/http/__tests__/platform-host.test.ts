import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Mirrors subdomain detection rules in src/proxy.ts (kept small & pure for unit tests).
 */
function isPlatformHostname(
  hostname: string,
  opts: {
    rootDomain: string;
    subdomain?: string;
    explicitHost?: string;
  },
): boolean {
  const host = hostname.split(':')[0]?.toLowerCase() ?? '';
  const rootHost = opts.rootDomain.split(':')[0]?.toLowerCase() ?? 'localhost';
  const sub = (opts.subdomain ?? 'platform').toLowerCase();

  if (host === `${sub}.localhost`) return true;
  if (host === `${sub}.${rootHost}`) return true;

  const explicit = opts.explicitHost?.split(':')[0]?.toLowerCase();
  if (explicit && host === explicit) return true;

  return false;
}

describe('platform host detection', () => {
  it('matches platform.localhost', () => {
    assert.equal(
      isPlatformHostname('platform.localhost', { rootDomain: 'localhost:3000' }),
      true,
    );
  });

  it('matches platform.example.com', () => {
    assert.equal(
      isPlatformHostname('platform.example.com', { rootDomain: 'example.com' }),
      true,
    );
  });

  it('rejects main app host', () => {
    assert.equal(
      isPlatformHostname('example.com', { rootDomain: 'example.com' }),
      false,
    );
    assert.equal(
      isPlatformHostname('localhost', { rootDomain: 'localhost:3000' }),
      false,
    );
  });

  it('honours explicit PLATFORM_HOST', () => {
    assert.equal(
      isPlatformHostname('ops.custom.test', {
        rootDomain: 'example.com',
        explicitHost: 'ops.custom.test',
      }),
      true,
    );
  });
});
