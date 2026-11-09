import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Static guard: people repository must scope by ctx.churchId / memberships.churchId.
 * Full DB cross-tenant tests run once DATABASE_URL is available.
 */
describe('people repository tenant scoping', () => {
  it('filters memberships by churchId from context', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = fs.readFileSync(path.join(here, '../repository.ts'), 'utf8');
    assert.match(source, /memberships\.churchId/);
    assert.match(source, /ctx\.churchId/);
    assert.doesNotMatch(source, /body\.churchId|query\.churchId|params\.churchId/);
  });
});
