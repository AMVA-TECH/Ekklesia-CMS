import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isApiDocsEnabled, docsDisabledResponse } from '../local-only.ts';

describe('api docs local-only guard', () => {
  it('follows NODE_ENV', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    assert.equal(isApiDocsEnabled(), true);
    process.env.NODE_ENV = 'test';
    assert.equal(isApiDocsEnabled(), true);
    process.env.NODE_ENV = 'production';
    assert.equal(isApiDocsEnabled(), false);
    process.env.NODE_ENV = prev;
  });

  it('returns 404 problem body when disabled', async () => {
    const res = docsDisabledResponse();
    assert.equal(res.status, 404);
    const body = (await res.json()) as { status: number };
    assert.equal(body.status, 404);
  });
});
