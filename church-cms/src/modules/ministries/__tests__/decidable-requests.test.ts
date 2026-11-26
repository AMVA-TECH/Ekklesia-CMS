import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Ctx } from '@/platform/auth';
import { filterDecidableRequests } from '../policies.ts';

const UNIT_A = '00000000-0000-4000-8000-00000000000a';
const UNIT_B = '00000000-0000-4000-8000-00000000000b';
const rows = [
  { id: '1', organisationalUnitId: UNIT_A },
  { id: '2', organisationalUnitId: UNIT_B },
];

function ctx(scopes?: Array<{ type: string; organisationalUnitId?: string }>): Ctx {
  return {
    actor: { personId: null },
    permissions: new Set(['participations:approve']),
    scopesByPermission: scopes ? new Map([['participations:approve', scopes]]) : undefined,
  } as unknown as Ctx;
}

describe('filterDecidableRequests', () => {
  it('lets church-wide approvers see every unit', () => {
    assert.deepEqual(filterDecidableRequests(ctx([{ type: 'church' }]), rows).map((r) => r.id), ['1', '2']);
    assert.equal(filterDecidableRequests(ctx(), rows).length, 2);
  });

  it('limits unit leaders to their own units', () => {
    const leader = ctx([{ type: 'organisational_unit', organisationalUnitId: UNIT_B }]);
    assert.deepEqual(filterDecidableRequests(leader, rows).map((r) => r.id), ['2']);
  });

  it('returns nothing without the permission', () => {
    const none = { actor: { personId: null }, permissions: new Set<string>() } as unknown as Ctx;
    assert.equal(filterDecidableRequests(none, rows).length, 0);
  });
});
