import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isAdult, ADULTHOOD_AGE_YEARS } from '../adulthood.ts';

describe('isAdult', () => {
  it('uses 18 as adulthood cutoff', () => {
    assert.equal(ADULTHOOD_AGE_YEARS, 18);
  });

  it('returns true for someone 18 on the as-of date', () => {
    assert.equal(isAdult('2000-01-01', new Date('2018-01-01')), true);
  });

  it('returns false the day before 18th birthday', () => {
    assert.equal(isAdult('2000-06-15', new Date('2018-06-14')), false);
  });

  it('returns false for invalid dates', () => {
    assert.equal(isAdult('not-a-date'), false);
  });
});
