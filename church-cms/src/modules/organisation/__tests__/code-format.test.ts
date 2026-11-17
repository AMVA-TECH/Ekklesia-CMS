import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CODE_NAMESPACES,
  codeNamespaceForUnitKind,
} from '../constants.ts';

describe('code namespaces', () => {
  it('maps ministry to MIN and others to ORG', () => {
    assert.equal(codeNamespaceForUnitKind('ministry'), 'min');
    assert.equal(codeNamespaceForUnitKind('department'), 'org');
    assert.equal(codeNamespaceForUnitKind('team'), 'org');
    assert.equal(codeNamespaceForUnitKind('branch'), 'org');
  });

  it('uses POS / ORG / MIN prefixes', () => {
    assert.equal(CODE_NAMESPACES.pos.prefix, 'POS');
    assert.equal(CODE_NAMESPACES.org.prefix, 'ORG');
    assert.equal(CODE_NAMESPACES.min.prefix, 'MIN');
  });
});
