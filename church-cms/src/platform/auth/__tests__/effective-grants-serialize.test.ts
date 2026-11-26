import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  churchWideScopesForPermissions,
  deserializeScopesByPermission,
  serializeScopesByPermission,
} from '../permissions-for-user.ts';

describe('effective grants serialization', () => {
  it('round-trips scopesByPermission', () => {
    const map = churchWideScopesForPermissions(['people:read', 'events:write']);
    const serialized = serializeScopesByPermission(map);
    const restored = deserializeScopesByPermission(serialized);
    assert.ok(restored);
    assert.deepEqual(restored.get('people:read'), [{ type: 'church' }]);
    assert.deepEqual(restored.get('events:write'), [{ type: 'church' }]);
  });
});
