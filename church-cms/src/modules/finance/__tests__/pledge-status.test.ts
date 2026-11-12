import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pledgeStatusFromApplied } from '../mappers';

describe('pledgeStatusFromApplied', () => {
  it('stays cancelled', () => {
    assert.equal(pledgeStatusFromApplied(1000, 500, 'cancelled'), 'cancelled');
  });

  it('returns open when nothing applied', () => {
    assert.equal(pledgeStatusFromApplied(1000, 0, 'open'), 'open');
  });

  it('returns partial when under amount', () => {
    assert.equal(pledgeStatusFromApplied(1000, 400, 'open'), 'partial');
  });

  it('returns fulfilled at or over amount', () => {
    assert.equal(pledgeStatusFromApplied(1000, 1000, 'partial'), 'fulfilled');
    assert.equal(pledgeStatusFromApplied(1000, 1200, 'partial'), 'fulfilled');
  });
});
