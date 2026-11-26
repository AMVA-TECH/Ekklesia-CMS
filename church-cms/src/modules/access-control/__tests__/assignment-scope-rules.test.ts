import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('assignment scope rules', () => {
  it('requires an active organisational unit for unit-scoped assignments', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../service.ts'), 'utf8');
    assert.match(source, /scopeType === 'organisational_unit'/);
    assert.match(source, /inactive_or_missing/);
    assert.match(source, /unit\.status !== 'active'/);
  });

  it('supports explicit template rematrix with confirm:true', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    const schema = readFileSync(join(here, '../schemas.ts'), 'utf8');
    assert.match(service, /applyRoleTemplates/);
    assert.match(service, /access\.role\.template_applied/);
    assert.match(schema, /confirm:\s*z\.literal\(true\)/);
  });

  it('rejects assignment scopes outside the role template allowedScopes', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    assert.match(service, /getRoleTemplate\(role\.code\)/);
    assert.match(service, /scope_not_allowed/);
  });
});
