import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { slugifyChurchName } from '../slug.ts';

describe('slugifyChurchName', () => {
  it('kebab-cases simple names', () => {
    assert.equal(slugifyChurchName('CrossLife Mission'), 'crosslife-mission');
  });

  it('strips punctuation and collapses dashes', () => {
    assert.equal(slugifyChurchName('  St. John\'s  Chapel!! '), 'st-john-s-chapel');
  });

  it('falls back when empty after cleaning', () => {
    assert.equal(slugifyChurchName('!!!'), 'church');
  });
});
