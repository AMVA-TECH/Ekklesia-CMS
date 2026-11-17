import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isTanzaniaMobileE164,
  normalizeTanzaniaPhoneE164,
} from '../tanzania.ts';

describe('normalizeTanzaniaPhoneE164', () => {
  it('accepts local 07… numbers', () => {
    assert.equal(normalizeTanzaniaPhoneE164('0712345678'), '+255712345678');
    assert.equal(normalizeTanzaniaPhoneE164('0712 345 678'), '+255712345678');
  });

  it('accepts national without trunk 0', () => {
    assert.equal(normalizeTanzaniaPhoneE164('712345678'), '+255712345678');
  });

  it('accepts +255 and 255 prefixes', () => {
    assert.equal(normalizeTanzaniaPhoneE164('+255712345678'), '+255712345678');
    assert.equal(normalizeTanzaniaPhoneE164('255712345678'), '+255712345678');
    assert.equal(normalizeTanzaniaPhoneE164('+255 712 345 678'), '+255712345678');
  });

  it('accepts 06… mobiles', () => {
    assert.equal(normalizeTanzaniaPhoneE164('0612345678'), '+255612345678');
  });

  it('rejects empty and incomplete', () => {
    assert.equal(normalizeTanzaniaPhoneE164(''), null);
    assert.equal(normalizeTanzaniaPhoneE164('0712'), null);
    assert.equal(normalizeTanzaniaPhoneE164('123456789'), null);
  });
});

describe('isTanzaniaMobileE164', () => {
  it('checks normalized shape', () => {
    assert.equal(isTanzaniaMobileE164('+255712345678'), true);
    assert.equal(isTanzaniaMobileE164('+254712345678'), false);
    assert.equal(isTanzaniaMobileE164('0712345678'), false);
  });
});
