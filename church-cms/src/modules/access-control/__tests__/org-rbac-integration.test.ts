import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('org leadership RBAC integration contracts', () => {
  it('enforces template allowedScopes on assignment create', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    assert.match(service, /scope_not_allowed/);
    assert.match(service, /allowedScopes/);
    assert.match(service, /sourceAppointmentId/);
  });

  it('member access includes appointments and assignment provenance', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    assert.match(service, /leadershipAppointments|appointments:/);
    assert.match(service, /sourceAppointmentId: a\.sourceAppointmentId/);
    assert.match(service, /listUnitAccessImpact/);
  });

  it('persists optional source_appointment_id column', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const schema = readFileSync(join(here, '../db-schema.ts'), 'utf8');
    const migration = readFileSync(
      join(here, '../../../../drizzle/0023_assignment_source_appointment.sql'),
      'utf8',
    );
    assert.match(schema, /sourceAppointmentId/);
    assert.match(migration, /source_appointment_id/);
  });
});
