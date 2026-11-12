import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCsv } from '../csv.ts';

describe('parseCsv', () => {
  it('parses headers and quoted commas', () => {
    const rows = parseCsv('displayName,phoneE164\n"Doe, Jane",+255700000001\n');
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.displayName, 'Doe, Jane');
    assert.equal(rows[0]!.phoneE164, '+255700000001');
  });
});
