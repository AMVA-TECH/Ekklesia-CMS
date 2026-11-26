import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHURCH_ADMINISTRATOR_PERMISSIONS,
  FINANCE_OFFICER_PERMISSIONS,
} from '../../platform-ops/role-bootstrap.ts';

describe('SoD role templates', () => {
  it('church administrator does not approve or post finance by default', () => {
    const set = new Set(CHURCH_ADMINISTRATOR_PERMISSIONS);
    assert.equal(set.has('disbursements:approve'), false);
    assert.equal(set.has('journals:post'), false);
    assert.equal(set.has('journals:reverse'), false);
    assert.equal(set.has('roles:assign'), true);
  });

  it('finance officer can request but not approve disbursements', () => {
    const set = new Set(FINANCE_OFFICER_PERMISSIONS);
    assert.equal(set.has('disbursements:request'), true);
    assert.equal(set.has('disbursements:approve'), false);
    assert.equal(set.has('journals:draft'), true);
  });
});
