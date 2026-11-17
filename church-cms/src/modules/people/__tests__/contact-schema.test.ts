import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPersonContactBodySchema } from '../schemas.ts';

describe('createPersonContactBodySchema', () => {
  it('accepts E.164 phone', () => {
    const parsed = createPersonContactBodySchema.parse({
      channel: 'phone',
      value: '+255711000111',
      isPrimary: true,
    });
    assert.equal(parsed.channel, 'phone');
  });

  it('normalizes local Tanzania phone to E.164', () => {
    const parsed = createPersonContactBodySchema.parse({
      channel: 'phone',
      value: '0711000111',
    });
    assert.equal(parsed.value, '+255711000111');
  });

  it('rejects an invalid phone', () => {
    assert.throws(() =>
      createPersonContactBodySchema.parse({
        channel: 'phone',
        value: '12345',
      }),
    );
  });

  it('accepts email contacts', () => {
    const parsed = createPersonContactBodySchema.parse({
      channel: 'email',
      value: 'member@example.com',
    });
    assert.equal(parsed.value, 'member@example.com');
  });
});
