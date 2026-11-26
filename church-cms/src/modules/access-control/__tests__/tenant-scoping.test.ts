import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Static guard: access-control repository/service must scope by ctx.churchId.
 * Full DB cross-tenant tests run once DATABASE_URL integration harness exists.
 */
describe('access-control tenant scoping', () => {
  it('scopes roles and assignments by churchId from context', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const repo = fs.readFileSync(path.join(here, '../repository.ts'), 'utf8');
    assert.match(repo, /roles\.churchId/);
    assert.match(repo, /userRoleAssignments\.churchId/);
    assert.match(repo, /ctx\.churchId/);
    assert.doesNotMatch(repo, /body\.churchId/);
  });

  it('validates organisational units via tenant-scoped getUnitById', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const service = fs.readFileSync(path.join(here, '../service.ts'), 'utf8');
    assert.match(service, /getUnitById/);
    assert.match(service, /inactive_or_missing/);
  });
});
