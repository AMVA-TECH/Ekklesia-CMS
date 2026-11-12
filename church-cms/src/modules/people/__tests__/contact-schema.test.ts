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

  it('rejects non-E.164 phone', () => {
    assert.throws(() =>
      createPersonContactBodySchema.parse({
        channel: 'phone',
        value: '0711000111',
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
