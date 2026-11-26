import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createServiceAccountBodySchema,
  patchOperatorBodySchema,
  patchTenantAccountBodySchema,
} from '../accounts-schemas.ts';

describe('patchOperatorBodySchema', () => {
  it('requires reason and a change', () => {
    const parsed = patchOperatorBodySchema.parse({
      status: 'suspended',
      reason: 'Compromised device reported',
    });
    assert.equal(parsed.status, 'suspended');
    assert.throws(() =>
      patchOperatorBodySchema.parse({
        reason: 'No actual change fields',
      }),
    );
  });
});

describe('patchTenantAccountBodySchema', () => {
  it('allows technical statuses only', () => {
    const parsed = patchTenantAccountBodySchema.parse({
      status: 'locked',
      reason: 'Repeated auth failures',
    });
    assert.equal(parsed.status, 'locked');
  });
});

describe('createServiceAccountBodySchema', () => {
  it('requires slug name and purpose', () => {
    const parsed = createServiceAccountBodySchema.parse({
      name: 'notify-worker',
      purpose: 'Outbound SMS delivery adapter',
    });
    assert.equal(parsed.environment, 'all');
    assert.throws(() =>
      createServiceAccountBodySchema.parse({
        name: 'Bad Name',
        purpose: 'too short',
      }),
    );
  });
});
