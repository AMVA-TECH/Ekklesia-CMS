import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PERMISSIONS } from '../permissions.ts';
import {
  assertCatalogueComplete,
  listChurchPermissionCatalogue,
} from '../permission-catalogue.ts';

describe('permission catalogue', () => {
  it('covers every PERMISSIONS code', () => {
    assert.doesNotThrow(() => assertCatalogueComplete());
  });

  it('excludes platform codes from church catalogue', () => {
    const church = listChurchPermissionCatalogue();
    assert.equal(
      church.some((p) => p.code.startsWith('platform:')),
      false,
    );
    assert.ok(church.length < PERMISSIONS.length);
  });
});
