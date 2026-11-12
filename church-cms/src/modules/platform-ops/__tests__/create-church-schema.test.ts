import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createChurchBodySchema } from '../schemas.ts';

describe('createChurchBodySchema', () => {
  it('accepts a minimal valid payload', () => {
    const parsed = createChurchBodySchema.parse({
      name: 'Hope Church',
      admin: {
        displayName: 'Ada Admin',
        email: 'ada@hope.example',
        pin: '123456',
      },
    });
    assert.equal(parsed.timezone, 'Africa/Dar_es_Salaam');
    assert.equal(parsed.defaultLocale, 'sw');
    assert.equal(parsed.admin.pin, '123456');
  });

  it('rejects a non-digit PIN', () => {
    assert.throws(() =>
      createChurchBodySchema.parse({
        name: 'Hope Church',
        admin: {
          displayName: 'Ada Admin',
          email: 'ada@hope.example',
          pin: 'abcdef',
        },
      }),
    );
  });

  it('rejects invalid phone', () => {
    assert.throws(() =>
      createChurchBodySchema.parse({
        name: 'Hope Church',
        admin: {
          displayName: 'Ada Admin',
          email: 'ada@hope.example',
          phoneE164: '0700123456',
          pin: '123456',
        },
      }),
    );
  });
});
