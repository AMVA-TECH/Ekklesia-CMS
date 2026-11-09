import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppError, notFound, unauthorized, validationFailed } from '../app-error.ts';

describe('AppError', () => {
  it('builds unauthorized with 401', () => {
    const err = unauthorized();
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 401);
    assert.equal(err.code, 'unauthorized');
  });

  it('uses notFound for cross-tenant hiding', () => {
    const err = notFound();
    assert.equal(err.status, 404);
    assert.equal(err.code, 'not_found');
  });

  it('carries field errors for validation', () => {
    const err = validationFailed([{ field: 'phone', code: 'invalid_phone_format' }]);
    assert.equal(err.status, 422);
    assert.equal(err.errors.length, 1);
  });
});
