import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Ctx } from '../../../platform/auth/ctx.ts';
import { can } from '../can.ts';

function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    churchId: 'church-1',
    requestId: 'req_1',
    locale: 'en',
    actor: { userAccountId: 'user-1', personId: 'person-1' },
    permissions: new Set(['people:read']),
    ...overrides,
  };
}

describe('can', () => {
  it('denies by default when permission missing', () => {
    assert.equal(can(ctx(), 'people:create'), false);
  });

  it('allows when permission present and no scope map', () => {
    assert.equal(can(ctx(), 'people:read'), true);
  });

  it('enforces self scope', () => {
    const scoped = ctx({
      scopesByPermission: new Map([
        ['people:read', [{ type: 'self' as const }]],
      ]),
    });

    assert.equal(can(scoped, 'people:read', { personId: 'person-1' }), true);
    assert.equal(can(scoped, 'people:read', { personId: 'other' }), false);
  });

  it('enforces organisational_unit scope', () => {
    const scoped = ctx({
      scopesByPermission: new Map([
        [
          'people:read',
          [{ type: 'organisational_unit' as const, organisationalUnitId: 'unit-a' }],
        ],
      ]),
    });

    assert.equal(
      can(scoped, 'people:read', { organisationalUnitId: 'unit-a' }),
      true,
    );
    assert.equal(
      can(scoped, 'people:read', { organisationalUnitId: 'unit-b' }),
      false,
    );
    assert.equal(can(scoped, 'people:read'), false);
  });

  it('church scope allows without resource context', () => {
    const scoped = ctx({
      scopesByPermission: new Map([
        ['people:read', [{ type: 'church' as const }]],
      ]),
    });
    assert.equal(can(scoped, 'people:read'), true);
  });

  it('enforces household membership via actorHouseholdIds', () => {
    const scoped = ctx({
      scopesByPermission: new Map([
        ['households:read', [{ type: 'household' as const }]],
      ]),
      permissions: new Set(['households:read']),
      actorHouseholdIds: new Set(['hh-1']),
    });

    assert.equal(can(scoped, 'households:read', { householdId: 'hh-1' }), true);
    assert.equal(can(scoped, 'households:read', { householdId: 'hh-2' }), false);
    assert.equal(can(scoped, 'households:read'), false);
  });

  it('unions multiple role scopes (church OR unit)', () => {
    const scoped = ctx({
      scopesByPermission: new Map([
        [
          'events:write',
          [
            { type: 'organisational_unit' as const, organisationalUnitId: 'unit-a' },
            { type: 'church' as const },
          ],
        ],
      ]),
      permissions: new Set(['events:write']),
    });
    assert.equal(can(scoped, 'events:write'), true);
    assert.equal(
      can(scoped, 'events:write', { organisationalUnitId: 'unit-b' }),
      true,
    );
  });

  it('unions two unit scopes without church-wide access', () => {
    const scoped = ctx({
      scopesByPermission: new Map([
        [
          'events:write',
          [
            { type: 'organisational_unit' as const, organisationalUnitId: 'unit-a' },
            { type: 'organisational_unit' as const, organisationalUnitId: 'unit-b' },
          ],
        ],
      ]),
      permissions: new Set(['events:write']),
    });
    assert.equal(
      can(scoped, 'events:write', { organisationalUnitId: 'unit-a' }),
      true,
    );
    assert.equal(
      can(scoped, 'events:write', { organisationalUnitId: 'unit-b' }),
      true,
    );
    assert.equal(
      can(scoped, 'events:write', { organisationalUnitId: 'unit-c' }),
      false,
    );
  });
});
