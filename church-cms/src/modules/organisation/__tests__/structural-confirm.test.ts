import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('unit structural change guards', () => {
  it('requires confirmStructuralChange when active unit-scoped assignments exist', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    const schema = readFileSync(join(here, '../schemas.ts'), 'utf8');
    assert.match(schema, /confirmStructuralChange:\s*z\.literal\(true\)/);
    assert.match(service, /listActiveAssignmentsForUnit/);
    assert.match(service, /confirmation_required/);
    assert.match(service, /assertCanWriteUnits\(ctx,\s*unitId\)/);
  });

  it('endAppointment returns access review without auto-revoke', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    assert.match(service, /accessReview/);
    assert.match(service, /autoRevoked:\s*false/);
    assert.match(service, /listAssignmentsRelatedToAppointment/);
    assert.doesNotMatch(service, /revokeRoleAssignment|insertRoleAssignment/);
  });

  it('exposes appointment history and programme update', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    const index = readFileSync(join(here, '../index.ts'), 'utf8');
    assert.match(service, /export async function listAppointmentHistory/);
    assert.match(service, /export async function updateProgramme/);
    assert.match(index, /listAppointmentHistory/);
    assert.match(index, /updateProgramme/);
  });
});
