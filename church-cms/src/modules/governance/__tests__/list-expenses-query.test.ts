import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listExpensesQuerySchema } from '../schemas.ts';

describe('listExpensesQuerySchema', () => {
  it('defaults the limit with no status filter', () => {
    const parsed = listExpensesQuerySchema.parse({});
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.status, undefined);
  });

  it('accepts a known status', () => {
    assert.equal(
      listExpensesQuerySchema.parse({ status: 'pending_approval' }).status,
      'pending_approval',
    );
  });

  it('rejects unknown statuses and oversized limits', () => {
    assert.throws(() => listExpensesQuerySchema.parse({ status: 'paid' }));
    assert.throws(() => listExpensesQuerySchema.parse({ limit: '500' }));
  });
});
