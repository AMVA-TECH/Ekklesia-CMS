import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  acceptAdminInviteBodySchema,
  decideApplicationBodySchema,
  submitChurchRegistrationBodySchema,
} from '../registration-schemas.ts';

describe('submitChurchRegistrationBodySchema', () => {
  it('accepts a minimal valid application', () => {
    const parsed = submitChurchRegistrationBodySchema.parse({
      officialName: 'Hope Chapel',
      representativeName: 'Amani Juma',
      email: 'pastor@hope.example',
    });
    assert.equal(parsed.country, 'TZ');
    assert.equal(parsed.preferredContact, 'email');
  });

  it('rejects short official names', () => {
    assert.throws(() =>
      submitChurchRegistrationBodySchema.parse({
        officialName: 'H',
        representativeName: 'Amani Juma',
        email: 'pastor@hope.example',
      }),
    );
  });
});

describe('decideApplicationBodySchema', () => {
  it('requires approve or reject', () => {
    const parsed = decideApplicationBodySchema.parse({
      decision: 'approve',
      slug: 'hope-chapel',
    });
    assert.equal(parsed.decision, 'approve');
  });
});

describe('acceptAdminInviteBodySchema', () => {
  it('requires pin digits', () => {
    assert.throws(() =>
      acceptAdminInviteBodySchema.parse({
        token: 'a'.repeat(20),
        pin: '12',
      }),
    );
    const ok = acceptAdminInviteBodySchema.parse({
      token: 'a'.repeat(20),
      pin: '123456',
    });
    assert.equal(ok.pin, '123456');
  });
});
