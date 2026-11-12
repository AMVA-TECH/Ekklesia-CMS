import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppError } from '@/platform/errors/app-error.ts';
import type { PlatformCtx } from '@/platform/auth';
import {
  assertPlatformAdmin,
  assertPlatformRead,
  assertPlatformSecurityRead,
} from '../policies.ts';

function platformCtx(
  perms: string[],
): PlatformCtx {
  return {
    actor: { userAccountId: 'op-1' },
    requestId: 'req-1',
    locale: 'en',
    platformPermissions: new Set(perms),
    isPlatformOperator: true,
  };
}

describe('platform-ops policies', () => {
  it('allows read with platform:read', () => {
    assert.doesNotThrow(() => assertPlatformRead(platformCtx(['platform:read'])));
  });

  it('allows read with platform:admin', () => {
    assert.doesNotThrow(() => assertPlatformRead(platformCtx(['platform:admin'])));
  });

  it('denies read without platform perms', () => {
    assert.throws(
      () => assertPlatformRead(platformCtx([])),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });

  it('denies admin without platform:admin', () => {
    assert.throws(
      () => assertPlatformAdmin(platformCtx(['platform:read'])),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });

  it('allows security read via platform:security_read', () => {
    assert.doesNotThrow(() =>
      assertPlatformSecurityRead(platformCtx(['platform:security_read'])),
    );
  });
});
