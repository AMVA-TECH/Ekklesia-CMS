import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Ctx } from '../../../platform/auth/ctx.ts';
import { AppError } from '../../../platform/errors/app-error.ts';
import {
  assertAssignerMayGrantPermissions,
  isHighRiskPermission,
} from '../delegation.ts';

function ctx(perms: string[]): Ctx {
  return {
    churchId: 'church-1',
    requestId: 'req_1',
    locale: 'en',
    actor: { userAccountId: 'user-1' },
    permissions: new Set(perms),
  };
}

describe('delegation subset rule', () => {
  it('marks high-risk permission codes', () => {
    assert.equal(isHighRiskPermission('roles:assign'), true);
    assert.equal(isHighRiskPermission('people:read'), false);
    assert.equal(isHighRiskPermission('platform:admin'), true);
  });

  it('allows granting only permissions the assigner holds', () => {
    assert.doesNotThrow(() =>
      assertAssignerMayGrantPermissions(ctx(['people:read', 'events:write']), [
        'people:read',
      ]),
    );
  });

  it('blocks granting permissions the assigner does not hold', () => {
    assert.throws(
      () =>
        assertAssignerMayGrantPermissions(ctx(['people:read']), [
          'roles:assign',
        ]),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });

  it('blocks platform permissions on church roles', () => {
    assert.throws(
      () =>
        assertAssignerMayGrantPermissions(
          ctx(['platform:admin', 'people:read']),
          ['platform:admin'],
        ),
      (err: unknown) => err instanceof AppError && err.status === 403,
    );
  });
});
