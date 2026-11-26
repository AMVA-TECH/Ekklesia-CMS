import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('last administrator protection', () => {
  it('blocks revoking the last church-scoped roles:assign holder', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const delegation = readFileSync(join(here, '../delegation.ts'), 'utf8');
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    assert.match(delegation, /assertNotLastRolesAssignHolder/);
    assert.match(delegation, /last church administrator/);
    assert.match(service, /assertNotLastRolesAssignHolder/);
  });
});
