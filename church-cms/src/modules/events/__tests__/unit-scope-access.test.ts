import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Ctx } from '../../../platform/auth/ctx.ts';
import { AppError } from '../../../platform/errors/app-error.ts';
import {
  assertCanReadEvents,
  assertCanWriteEvents,
} from '../policies.ts';

function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    churchId: 'church-1',
    requestId: 'req_1',
    locale: 'en',
    actor: { userAccountId: 'user-1', personId: 'person-1' },
    permissions: new Set(['events:read', 'events:write']),
    ...overrides,
  };
}

describe('events unit-scoped policies', () => {
  it('allows church-wide events:read without unit context', () => {
    assert.doesNotThrow(() =>
      assertCanReadEvents(
        ctx({
          scopesByPermission: new Map([
            ['events:read', [{ type: 'church' as const }]],
          ]),
        }),
      ),
    );
  });

  it('denies unit-scoped reader for a different unit', () => {
    assert.throws(
      () =>
        assertCanReadEvents(
          ctx({
            scopesByPermission: new Map([
              [
                'events:read',
                [
                  {
                    type: 'organisational_unit' as const,
                    organisationalUnitId: 'unit-a',
                  },
                ],
              ],
            ]),
          }),
          'unit-b',
        ),
      (err: unknown) => err instanceof AppError && err.code === 'forbidden',
    );
  });

  it('allows unit-scoped writer for matching unit', () => {
    assert.doesNotThrow(() =>
      assertCanWriteEvents(
        ctx({
          scopesByPermission: new Map([
            [
              'events:write',
              [
                {
                  type: 'organisational_unit' as const,
                  organisationalUnitId: 'unit-a',
                },
              ],
            ],
          ]),
        }),
        'unit-a',
      ),
    );
  });
});
