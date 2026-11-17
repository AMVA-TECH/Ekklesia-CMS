import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Guardrail: appointment creation must not assign roles / permissions.
 * (Behavioural coverage of createAppointment stays in service; this locks the
 * intentional separation into the source contract.)
 */
describe('appointment RBAC separation', () => {
  it('createAppointment documents that appointments never grant permissions', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const servicePath = join(here, '../service.ts');
    const source = readFileSync(servicePath, 'utf8');
    assert.match(source, /Appointments never grant RBAC/);
    assert.match(source, /grantsPermissions:\s*false/);
    assert.equal(/role-assignments|assignRole|user_role_assignments/i.test(source), false);
  });
});
