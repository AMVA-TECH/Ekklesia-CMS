import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppError } from '../../errors/app-error.ts';
import { requireCtx } from '../require-ctx.ts';

describe('requireCtx', () => {
  it('throws 401 when session is missing', () => {
    assert.throws(
      () => requireCtx({ requestId: 'req_1', session: null }),
      (err: unknown) => err instanceof AppError && err.status === 401,
    );
  });

  it('builds ctx from server session church id', () => {
    const ctx = requireCtx({
      requestId: 'req_2',
      session: {
        userAccountId: 'user-1',
        personId: 'person-1',
        activeChurchId: 'church-1',
        permissions: ['people:read'],
        locale: 'en',
      },
    });
    assert.equal(ctx.churchId, 'church-1');
    assert.equal(ctx.actor.userAccountId, 'user-1');
    assert.equal(ctx.permissions.has('people:read'), true);
    assert.equal(ctx.locale, 'en');
  });
});
