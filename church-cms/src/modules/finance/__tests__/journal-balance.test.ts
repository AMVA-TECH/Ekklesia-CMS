import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { journalLinesBalance } from '../journal-math.ts';

describe('journalLinesBalance', () => {
  it('accepts balanced two-line entry', () => {
    assert.equal(
      journalLinesBalance([
        { debitMinor: 1000, creditMinor: 0 },
        { debitMinor: 0, creditMinor: 1000 },
      ]),
      true,
    );
  });
  it('rejects unbalanced entry', () => {
    assert.equal(
      journalLinesBalance([
        { debitMinor: 1000, creditMinor: 0 },
        { debitMinor: 0, creditMinor: 500 },
      ]),
      false,
    );
  });
  it('rejects both debit and credit on one line', () => {
    assert.equal(
      journalLinesBalance([
        { debitMinor: 100, creditMinor: 100 },
        { debitMinor: 0, creditMinor: 0 },
      ]),
      false,
    );
  });
});
