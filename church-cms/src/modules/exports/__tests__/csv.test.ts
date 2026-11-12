import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { csvCell, toCsv } from '../csv.ts';

describe('export csv', () => {
  it('quotes commas and quotes', () => {
    assert.equal(csvCell('a,b'), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  });

  it('builds a header + rows document', () => {
    const out = toCsv(['id', 'name'], [[1, 'Ada'], [2, 'Bob, Jr']]);
    assert.equal(out, 'id,name\n1,Ada\n2,"Bob, Jr"\n');
  });
});
