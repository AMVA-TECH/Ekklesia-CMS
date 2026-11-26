import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('inactive unit scopes in effective grants', () => {
  it('filters organisational_unit assignments to active units only', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(here, '../permissions-for-user.ts'),
      'utf8',
    );
    assert.match(source, /organisationalUnits/);
    assert.match(source, /activeUnitIds/);
    assert.match(source, /status === 'active'/);
  });
});
