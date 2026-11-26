import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  churchPermissionsForSupportAccess,
  SUPPORT_INTERACTIVE_CHURCH_PERMISSIONS,
  SUPPORT_READ_CHURCH_PERMISSIONS,
} from '../support-access.ts';

describe('churchPermissionsForSupportAccess', () => {
  it('read excludes writes, finance, and Restricted', () => {
    const perms = churchPermissionsForSupportAccess('read');
    assert.ok(perms.includes('people:read'));
    assert.ok(perms.includes('church:read'));
    assert.ok(!perms.includes('people:update'));
    assert.ok(!perms.includes('people:read_restricted'));
    assert.ok(!perms.includes('funds:read'));
    assert.ok(!perms.includes('journals:post'));
    assert.ok(!perms.some((p) => p.startsWith('platform:')));
    assert.deepEqual([...perms], [...SUPPORT_READ_CHURCH_PERMISSIONS]);
  });

  it('interactive is full church plane without platform codes', () => {
    const perms = churchPermissionsForSupportAccess('interactive');
    assert.ok(perms.includes('people:update'));
    assert.ok(perms.includes('journals:post'));
    assert.ok(!perms.some((p) => p.startsWith('platform:')));
    assert.deepEqual([...perms], [...SUPPORT_INTERACTIVE_CHURCH_PERMISSIONS]);
  });
});
