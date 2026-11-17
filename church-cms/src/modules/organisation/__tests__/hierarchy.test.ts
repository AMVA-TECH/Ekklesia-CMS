import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { wouldCreateCycle } from '../hierarchy.ts';

describe('wouldCreateCycle', () => {
  it('allows null parent', () => {
    const parentById = new Map<string, string | null>([['a', null], ['b', 'a']]);
    assert.equal(wouldCreateCycle('b', null, parentById), false);
  });

  it('rejects self as parent', () => {
    const parentById = new Map<string, string | null>([['a', null]]);
    assert.equal(wouldCreateCycle('a', 'a', parentById), true);
  });

  it('rejects ancestor as parent', () => {
    const parentById = new Map<string, string | null>([
      ['root', null],
      ['mid', 'root'],
      ['leaf', 'mid'],
    ]);
    assert.equal(wouldCreateCycle('root', 'leaf', parentById), true);
  });

  it('allows sibling reparent', () => {
    const parentById = new Map<string, string | null>([
      ['root', null],
      ['a', 'root'],
      ['b', 'root'],
    ]);
    assert.equal(wouldCreateCycle('a', 'b', parentById), false);
  });
});
