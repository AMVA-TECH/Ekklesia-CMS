import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Ctx } from '@/platform/auth';
import { grantsNotHeld } from '../policies.ts';

const ctx = { permissions: new Set(['disbursements:approve', 'announcements:publish']) } as unknown as Ctx;

describe('grantsNotHeld (delegations)', () => {
  it('allows delegating permissions the delegator holds', () => {
    assert.deepEqual(grantsNotHeld(ctx, ['disbursements:approve']), []);
  });

  it('reports permissions the delegator does not hold', () => {
    assert.deepEqual(grantsNotHeld(ctx, ['disbursements:approve', 'roles:assign']), ['roles:assign']);
  });
});
