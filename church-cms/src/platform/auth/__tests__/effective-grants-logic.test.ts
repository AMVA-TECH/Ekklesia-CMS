import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AuthScope } from '../../../modules/access-control/can.ts';
import {
  applyAssignmentGrants,
  isAssignmentEffective,
  isDelegationGrantActive,
  shouldIncludeUnitAssignment,
} from '../effective-grants-logic.ts';

describe('effective grants logic', () => {
  it('skips inactive organisational unit assignments', () => {
    assert.equal(
      shouldIncludeUnitAssignment('unit-a', new Set(['unit-b'])),
      false,
    );
    assert.equal(
      shouldIncludeUnitAssignment('unit-a', new Set(['unit-a'])),
      true,
    );
    assert.equal(shouldIncludeUnitAssignment(null, new Set(['unit-a'])), false);
  });

  it('filters expired and not-yet-effective assignments', () => {
    const now = new Date('2025-06-15T12:00:00.000Z');
    assert.equal(
      isAssignmentEffective(
        new Date('2025-01-01T00:00:00.000Z'),
        null,
        now,
      ),
      true,
    );
    assert.equal(
      isAssignmentEffective(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-06-01T00:00:00.000Z'),
        now,
      ),
      false,
    );
    assert.equal(
      isAssignmentEffective(
        new Date('2025-07-01T00:00:00.000Z'),
        null,
        now,
      ),
      false,
    );
    assert.equal(
      isAssignmentEffective(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-12-01T00:00:00.000Z'),
        now,
      ),
      true,
    );
  });

  it('activates delegation grants only inside the window', () => {
    const now = new Date('2025-06-15T12:00:00.000Z');
    assert.equal(
      isDelegationGrantActive(
        'active',
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-12-01T00:00:00.000Z'),
        now,
      ),
      true,
    );
    assert.equal(
      isDelegationGrantActive(
        'active',
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-06-01T00:00:00.000Z'),
        now,
      ),
      false,
    );
    assert.equal(
      isDelegationGrantActive(
        'revoked',
        new Date('2025-01-01T00:00:00.000Z'),
        null,
        now,
      ),
      false,
    );
    assert.equal(
      isDelegationGrantActive(
        'scheduled',
        new Date('2025-07-01T00:00:00.000Z'),
        null,
        now,
      ),
      false,
    );
  });

  it('unions permissions and scopes from multiple assignments', () => {
    const permissionSet = new Set<string>();
    const scopesByPermission = new Map<string, AuthScope[]>();
    const activeUnitIds = new Set(['unit-a']);

    applyAssignmentGrants({
      codes: ['events:write', 'attendance:record'],
      scopeType: 'organisational_unit',
      organisationalUnitId: 'unit-a',
      activeUnitIds,
      permissionSet,
      scopesByPermission,
    });
    applyAssignmentGrants({
      codes: ['events:write', 'church:read'],
      scopeType: 'church',
      activeUnitIds,
      permissionSet,
      scopesByPermission,
    });
    // Expired/inactive unit must contribute nothing
    applyAssignmentGrants({
      codes: ['funds:read'],
      scopeType: 'organisational_unit',
      organisationalUnitId: 'unit-dead',
      activeUnitIds,
      permissionSet,
      scopesByPermission,
    });

    assert.equal(permissionSet.has('events:write'), true);
    assert.equal(permissionSet.has('attendance:record'), true);
    assert.equal(permissionSet.has('church:read'), true);
    assert.equal(permissionSet.has('funds:read'), false);

    const eventScopes = scopesByPermission.get('events:write') ?? [];
    assert.equal(eventScopes.some((s) => s.type === 'church'), true);
    assert.equal(
      eventScopes.some(
        (s) =>
          s.type === 'organisational_unit' &&
          s.organisationalUnitId === 'unit-a',
      ),
      true,
    );
  });
});
