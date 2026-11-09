import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Ctx } from '../../../platform/auth/ctx.ts';
import { can } from '../can.ts';

function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    churchId: 'church-1',
    requestId: 'req_1',
    locale: 'en',
    actor: { userAccountId: 'user-1', personId: 'person-1' },
    permissions: new Set(['people:read']),
    ...overrides,
  };
}

describe('can', () => {
  it('denies by default when permission missing', () => {
    assert.equal(can(ctx(), 'people:create'), false);
  });

  it('allows when permission present and no scope map', () => {
    assert.equal(can(ctx(), 'people:read'), true);
  });

  it('enforces self scope', () => {
    const scoped = ctx({
      scopesByPermission: new Map([
        ['people:read', [{ type: 'self' as const }]],
      ]),
    });

    assert.equal(can(scoped, 'people:read', { personId: 'person-1' }), true);
    assert.equal(can(scoped, 'people:read', { personId: 'other' }), false);
  });
});
