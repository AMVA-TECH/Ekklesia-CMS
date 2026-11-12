import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bandForRate,
  familyStatusForDay,
  nudgeForBand,
} from '../progress.ts';

describe('attendance progress bands', () => {
  it('marks insufficient data when no sessions', () => {
    assert.equal(bandForRate(0, 0), 'insufficient_data');
    assert.equal(nudgeForBand('insufficient_data'), null);
  });

  it('bands by rate thresholds', () => {
    assert.equal(bandForRate(8, 10), 'consistent');
    assert.equal(bandForRate(5, 10), 'irregular');
    assert.equal(bandForRate(2, 10), 'missing');
  });

  it('maps bands to encouragement nudges', () => {
    assert.equal(nudgeForBand('consistent'), 'congratulate');
    assert.equal(nudgeForBand('irregular'), 'encourage');
    assert.equal(nudgeForBand('missing'), 'remind');
  });
});

describe('family attendance day status', () => {
  it('is full when all adults present', () => {
    assert.equal(
      familyStatusForDay({ adultCount: 2, adultsPresent: 2, notices: 0 }),
      'full',
    );
  });

  it('is partial when some adults present', () => {
    assert.equal(
      familyStatusForDay({ adultCount: 2, adultsPresent: 1, notices: 0 }),
      'partial',
    );
  });

  it('is notice when nobody present but notices exist', () => {
    assert.equal(
      familyStatusForDay({ adultCount: 2, adultsPresent: 0, notices: 1 }),
      'notice',
    );
  });

  it('is absent when nobody present and no notices', () => {
    assert.equal(
      familyStatusForDay({ adultCount: 2, adultsPresent: 0, notices: 0 }),
      'absent',
    );
  });
});
