import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { slugifyTemplateCode } from '../template-code.ts';

describe('slugifyTemplateCode', () => {
  it('turns a plain name into snake_case', () => {
    assert.equal(slugifyTemplateCode('Sunday welcome'), 'sunday_welcome');
  });

  it('strips punctuation and collapses separators', () => {
    assert.equal(slugifyTemplateCode("  St. John's  reminder!! "), 'st_john_s_reminder');
  });

  it('falls back when empty', () => {
    assert.equal(slugifyTemplateCode('!!!'), 'template');
  });
});
