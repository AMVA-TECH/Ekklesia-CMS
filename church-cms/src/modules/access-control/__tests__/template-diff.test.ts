import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { diffPermissionSets } from '../template-diff.ts';

describe('diffPermissionSets', () => {
  it('reports inSync when sets match ignoring order', () => {
    const diff = diffPermissionSets(
      ['a:read', 'b:write'],
      ['b:write', 'a:read'],
    );
    assert.equal(diff.inSync, true);
    assert.deepEqual(diff.added, []);
    assert.deepEqual(diff.removed, []);
  });

  it('reports added and removed codes', () => {
    const diff = diffPermissionSets(
      ['roles:read', 'journals:post'],
      ['roles:read', 'roles:assign'],
    );
    assert.equal(diff.inSync, false);
    assert.deepEqual(diff.added, ['roles:assign']);
    assert.deepEqual(diff.removed, ['journals:post']);
  });
});
