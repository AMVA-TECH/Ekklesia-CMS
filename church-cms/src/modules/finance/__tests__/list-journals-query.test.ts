import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listJournalsQuerySchema } from '../schemas.ts';

describe('listJournalsQuerySchema', () => {
  it('defaults the limit and leaves filters optional', () => {
    const parsed = listJournalsQuerySchema.parse({});
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.status, undefined);
  });

  it('accepts a status filter and coerces limit', () => {
    const parsed = listJournalsQuerySchema.parse({ status: 'posted', limit: '10' });
    assert.equal(parsed.status, 'posted');
    assert.equal(parsed.limit, 10);
  });

  it('rejects unknown statuses', () => {
    assert.throws(() => listJournalsQuerySchema.parse({ status: 'void' }));
  });
});
