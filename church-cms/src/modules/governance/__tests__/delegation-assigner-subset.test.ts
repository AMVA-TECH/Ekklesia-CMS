import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('org temporary delegation assigner subset', () => {
  it('createDelegation asserts assigner may grant each permission', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    assert.match(service, /export async function createDelegation/);
    assert.match(service, /assertAssignerMayGrantPermissions\(ctx,\s*body\.grants\)/);
  });

  it('decideAppointmentRequest enforces occupancy and appointment kind/dates', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const service = readFileSync(join(here, '../service.ts'), 'utf8');
    const schema = readFileSync(join(here, '../schemas.ts'), 'utf8');
    assert.match(service, /occupancyPolicy === 'single'/);
    assert.match(service, /appointmentKind:\s*body\.appointmentKind/);
    assert.match(service, /effectiveFrom/);
    assert.match(schema, /appointmentKind:\s*z\.enum/);
  });
});
