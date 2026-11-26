import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSupportCaseBodySchema,
  enterTenantSupportBodySchema,
  startSupportSessionBodySchema,
} from '../support-schemas.ts';
import {
  createAccessReviewBodySchema,
  createBreakGlassBodySchema,
  revokeBreakGlassBodySchema,
} from '../security-depth-schemas.ts';

describe('createSupportCaseBodySchema', () => {
  it('defaults priority and severity', () => {
    const parsed = createSupportCaseBodySchema.parse({
      title: 'SMS delivery stalled',
    });
    assert.equal(parsed.priority, 'medium');
    assert.equal(parsed.severity, 'medium');
  });
});

describe('startSupportSessionBodySchema', () => {
  it('defaults access level to read', () => {
    const parsed = startSupportSessionBodySchema.parse({
      churchId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      purpose: 'Investigate failed blast job',
    });
    assert.equal(parsed.accessLevel, 'read');
    assert.equal(parsed.expiresInMinutes, 60);
  });
});

describe('enterTenantSupportBodySchema', () => {
  it('requires a documented reason and defaults to read', () => {
    assert.throws(() =>
      enterTenantSupportBodySchema.parse({ reason: 'short' }),
    );
    const ok = enterTenantSupportBodySchema.parse({
      reason: 'Investigating notify failure for tenant',
    });
    assert.equal(ok.accessLevel, 'read');
  });
});

describe('createAccessReviewBodySchema', () => {
  it('accepts known scopes', () => {
    const parsed = createAccessReviewBodySchema.parse({
      title: 'Q4 operator review',
      scope: 'platform_operators',
    });
    assert.equal(parsed.scope, 'platform_operators');
    assert.throws(() =>
      createAccessReviewBodySchema.parse({
        title: 'Bad',
        scope: 'church_roles',
      }),
    );
  });
});

describe('createBreakGlassBodySchema', () => {
  it('requires emergency reason and catalogue permissions', () => {
    assert.throws(() =>
      createBreakGlassBodySchema.parse({
        operatorEmail: 'ops@example.com',
        reason: 'too short',
        permissions: ['platform:admin'],
      }),
    );
    const ok = createBreakGlassBodySchema.parse({
      operatorEmail: 'ops@example.com',
      reason: 'Production outage needs temporary elevate',
      permissions: ['platform:impersonate_tenant'],
    });
    assert.equal(ok.expiresInMinutes, 60);
  });
});

describe('revokeBreakGlassBodySchema', () => {
  it('requires a revoke reason', () => {
    assert.throws(() => revokeBreakGlassBodySchema.parse({ reason: 'nope' }));
    const ok = revokeBreakGlassBodySchema.parse({
      reason: 'Incident closed; revoke elevate',
    });
    assert.ok(ok.reason.length >= 8);
  });
});
