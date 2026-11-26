import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppError } from '@/platform/errors/app-error.ts';
import type { PlatformCtx } from '@/platform/auth';
import {
  assertPlatformAdmin,
  assertPlatformAccessReviews,
  assertPlatformApplicationsDecide,
  assertPlatformApplicationsReview,
  assertPlatformBreakGlass,
  assertPlatformCan,
  assertPlatformChurchesWrite,
  assertPlatformOperatorsManage,
  assertPlatformRead,
  assertPlatformSecurityRead,
  assertPlatformSupportCases,
} from '../policies.ts';

function platformCtx(perms: string[]): PlatformCtx {
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

  it('assertPlatformCan grants via admin super-set', () => {
    assert.doesNotThrow(() =>
      assertPlatformCan(platformCtx(['platform:admin']), 'platform:churches_write'),
    );
  });

  it('assertPlatformCan denies missing granular code', () => {
    assert.throws(
      () =>
        assertPlatformChurchesWrite(
          platformCtx(['platform:read', 'platform:churches_read']),
        ),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });

  it('operators_manage is required for operator admin APIs', () => {
    assert.doesNotThrow(() =>
      assertPlatformOperatorsManage(
        platformCtx(['platform:operators_manage']),
      ),
    );
    assert.throws(
      () => assertPlatformOperatorsManage(platformCtx(['platform:read'])),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });

  it('applications_review allows decide holders and admin', () => {
    assert.doesNotThrow(() =>
      assertPlatformApplicationsReview(
        platformCtx(['platform:applications_review']),
      ),
    );
    assert.doesNotThrow(() =>
      assertPlatformApplicationsReview(
        platformCtx(['platform:applications_decide']),
      ),
    );
    assert.throws(
      () => assertPlatformApplicationsReview(platformCtx(['platform:read'])),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });

  it('applications_decide is required to approve or reject', () => {
    assert.doesNotThrow(() =>
      assertPlatformApplicationsDecide(
        platformCtx(['platform:applications_decide']),
      ),
    );
    assert.throws(
      () =>
        assertPlatformApplicationsDecide(
          platformCtx(['platform:applications_review']),
        ),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });

  it('support_cases / access_reviews / break_glass are gated', () => {
    assert.doesNotThrow(() =>
      assertPlatformSupportCases(platformCtx(['platform:support_cases'])),
    );
    assert.doesNotThrow(() =>
      assertPlatformAccessReviews(platformCtx(['platform:access_reviews'])),
    );
    assert.doesNotThrow(() =>
      assertPlatformBreakGlass(platformCtx(['platform:break_glass'])),
    );
    assert.throws(
      () => assertPlatformSupportCases(platformCtx(['platform:read'])),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
    assert.throws(
      () => assertPlatformBreakGlass(platformCtx(['platform:support_cases'])),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });
});
