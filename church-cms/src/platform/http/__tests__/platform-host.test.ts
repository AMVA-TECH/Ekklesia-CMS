import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Legacy subdomain hosts still redirect to same-origin `/platform`
 * (see src/proxy.ts). Detection rules kept here for unit coverage.
 */
function isLegacyPlatformHostname(
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
  if (
    rootHost &&
    rootHost !== 'localhost' &&
    rootHost !== '127.0.0.1' &&
    host === `${sub}.${rootHost}`
  ) {
    return true;
  }

  const explicit = opts.explicitHost?.split(':')[0]?.toLowerCase();
  if (explicit && host === explicit) return true;

  return false;
}

describe('legacy platform host detection', () => {
  it('matches platform.localhost for redirect', () => {
    assert.equal(
      isLegacyPlatformHostname('platform.localhost', {
        rootDomain: 'localhost:3000',
      }),
      true,
    );
  });

  it('matches platform.example.com for redirect', () => {
    assert.equal(
      isLegacyPlatformHostname('platform.example.com', {
        rootDomain: 'example.com',
      }),
      true,
    );
  });

  it('does not treat main app host as platform host', () => {
    assert.equal(
      isLegacyPlatformHostname('example.com', { rootDomain: 'example.com' }),
      false,
    );
    assert.equal(
      isLegacyPlatformHostname('localhost', { rootDomain: 'localhost:3000' }),
      false,
    );
  });

  it('honours explicit PLATFORM_HOST', () => {
    assert.equal(
      isLegacyPlatformHostname('ops.custom.test', {
        rootDomain: 'example.com',
        explicitHost: 'ops.custom.test',
      }),
      true,
    );
  });
});
