import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PARTICIPATION_STATUS_TRANSITIONS } from '../constants.ts';

describe('participation status transitions', () => {
  it('allows active to ended', () => {
    assert.deepEqual(PARTICIPATION_STATUS_TRANSITIONS.active, ['ended']);
  });

  it('allows ended back to active', () => {
    assert.deepEqual(PARTICIPATION_STATUS_TRANSITIONS.ended, ['active']);
  });
});
