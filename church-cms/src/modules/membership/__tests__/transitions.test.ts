import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MEMBERSHIP_STATUS_TRANSITIONS } from '../constants.ts';

describe('membership status transitions', () => {
  it('allows visitor to active or inactive', () => {
    assert.deepEqual(MEMBERSHIP_STATUS_TRANSITIONS.visitor, ['active', 'inactive']);
  });

  it('allows active only to inactive', () => {
    assert.deepEqual(MEMBERSHIP_STATUS_TRANSITIONS.active, ['inactive']);
  });

  it('allows inactive back to active', () => {
    assert.deepEqual(MEMBERSHIP_STATUS_TRANSITIONS.inactive, ['active']);
  });

  it('does not allow visitor to jump without listed transition', () => {
    assert.equal(
      (MEMBERSHIP_STATUS_TRANSITIONS.visitor as readonly string[]).includes('visitor'),
      false,
    );
  });
});
