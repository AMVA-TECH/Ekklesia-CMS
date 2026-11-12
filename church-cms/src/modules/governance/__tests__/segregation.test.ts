import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Dual-control rule for leadership approvals. */
function canDecide(requestedByUserId: string, actorUserId: string): boolean {
  return requestedByUserId !== actorUserId;
}

describe('approval segregation of duties', () => {
  it('blocks the requester from approving their own request', () => {
    assert.equal(canDecide('user-a', 'user-a'), false);
  });

  it('allows a different leader to decide', () => {
    assert.equal(canDecide('user-a', 'user-b'), true);
  });
});
